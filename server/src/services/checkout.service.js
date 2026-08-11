import { prisma } from '../config/db.js';
import { ERROR_CODES } from '../config/constants.js';
import { nowUTC } from '../utils/datetime.js';
import { validateCoupon, getEligibleCoupons } from './couponValidation.service.js';
import { createRazorpayOrder } from '../lib/razorpay.js';

const SLOT_HOLD_MINUTES = 15;

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

export async function getOrderForUser(userId, orderId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    select: { orderNumber: true, status: true, total: true, amountPaid: true, amountDue: true, eventDate: true },
  });
  if (!order) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Order not found');
  return { ...order, eventDate: order.eventDate.toISOString().slice(0, 10) };
}

// GET /checkout/my-orders — every order a customer has placed, newest first,
// for the profile page's order history list.
export async function listOrdersForUser(userId) {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  });

  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    eventDate: o.eventDate.toISOString().slice(0, 10),
    total: o.total,
    amountPaid: o.amountPaid,
    amountDue: o.amountDue,
    itemCount: o.items.length,
    thumbnailTitle: o.items[0]?.productSnapshot?.title,
    createdAt: o.createdAt,
  }));
}

// GET /checkout/my-orders/:orderId — full detail for one of the customer's
// own orders (line items, address, payment status), for the profile page's
// order detail view.
export async function getOrderDetailForUser(userId, orderId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      items: true,
      payments: { orderBy: { createdAt: 'desc' } },
      city: { select: { name: true } },
    },
  });
  if (!order) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Order not found');

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    eventDate: order.eventDate.toISOString().slice(0, 10),
    cityName: order.city.name,
    addressSnapshot: order.addressSnapshot,
    subtotal: order.subtotal,
    addOnTotal: order.addOnTotal,
    deliveryCharge: order.deliveryCharge,
    surgeCharge: order.surgeCharge,
    discount: order.discount,
    couponCode: order.couponCode,
    total: order.total,
    amountPaid: order.amountPaid,
    amountDue: order.amountDue,
    paymentMode: order.paymentMode,
    customerNote: order.customerNote,
    createdAt: order.createdAt,
    items: order.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productSlug: i.productSnapshot?.slug,
      title: i.productSnapshot?.title,
      variant: i.productSnapshot?.variant,
      qty: i.qty,
      unitPrice: i.unitPrice,
      subtotal: i.subtotal,
      addOns: i.addOnsSnapshot || [],
    })),
    payments: order.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      method: p.method,
      createdAt: p.createdAt,
    })),
  };
}

function generateOrderNumber() {
  const now = nowUTC();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `HE-${yyyymm}-${rand}`;
}

// Builds the priced line items + totals from the user's current cart —
// shared by the "review my order" preview and the actual order-create step
// so the number the customer sees is guaranteed to be the number they're
// charged (both read the exact same cart + product/add-on prices at call time).
async function priceCart(userId) {
  const cart = await prisma.cart.findFirst({
    where: { userId },
    include: {
      items: {
        include: {
          product: { include: { categories: true } },
          variant: true,
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw apiError(422, ERROR_CODES.VALIDATION_ERROR, 'Your cart is empty');
  }

  const inactiveItem = cart.items.find((item) => !item.product.isActive);
  if (inactiveItem) {
    throw apiError(422, ERROR_CODES.VALIDATION_ERROR, `"${inactiveItem.product.title}" is no longer available`);
  }

  const addOnIds = [...new Set(cart.items.flatMap((item) => item.addOnIds))];
  const addOns = addOnIds.length ? await prisma.addOn.findMany({ where: { id: { in: addOnIds } } }) : [];
  const addOnsById = new Map(addOns.map((a) => [a.id, a]));

  const lineItems = cart.items.map((item) => {
    const itemAddOns = item.addOnIds.map((id) => addOnsById.get(id)).filter(Boolean);
    const addOnTotal = itemAddOns.reduce((sum, a) => sum + Number(a.price), 0);
    const unitPrice = Number(item.product.price) + addOnTotal;

    return {
      cartItem: item,
      product: item.product,
      variant: item.variant,
      addOns: itemAddOns,
      unitPrice,
      subtotal: unitPrice * item.qty,
    };
  });

  const subtotal = lineItems.reduce((sum, li) => sum + li.subtotal, 0);
  const addOnTotal = lineItems.reduce(
    (sum, li) => sum + li.addOns.reduce((s, a) => s + Number(a.price), 0) * li.cartItem.qty,
    0
  );

  const categoryIds = [...new Set(lineItems.flatMap((li) => li.product.categories.map((c) => c.categoryId)))];

  return { cart, lineItems, subtotal, addOnTotal, categoryIds };
}

// Shared by previewOrder and createOrder — advance mode only discounts the
// decoration/product price; add-ons, delivery, and surge are always
// collected in full since they're pass-through costs (cake, flowers,
// logistics) that can't be partially prepaid on the customer's behalf.
function computeAdvanceDueNow({ productSubtotal, discount, addOnAndFeesTotal, productWithAdvance }) {
  const productSubtotalAfterDiscount = Math.max(0, productSubtotal - discount);

  if (productWithAdvance?.advanceAmount) {
    return addOnAndFeesTotal + Math.min(Number(productWithAdvance.advanceAmount), productSubtotalAfterDiscount);
  }
  if (productWithAdvance?.advancePercent) {
    return addOnAndFeesTotal + Math.round(productSubtotalAfterDiscount * (Number(productWithAdvance.advancePercent) / 100) * 100) / 100;
  }
  return addOnAndFeesTotal + Math.round(productSubtotalAfterDiscount * 0.5 * 100) / 100;
}

// GET /checkout/preview — priced breakdown the client shows before payment,
// with an optional coupon applied. Doesn't create anything.
export async function previewOrder(userId, { cityId, couponCode }) {
  const { lineItems, subtotal, addOnTotal, categoryIds } = await priceCart(userId);
  const productSubtotal = subtotal - addOnTotal;

  let discount = 0;
  let appliedCoupon = null;

  if (couponCode) {
    const result = await validateCoupon(couponCode, { subtotal, productSubtotal, cityId, categoryIds, userId });
    discount = result.discount;
    appliedCoupon = result.coupon.code;
  }

  const total = Math.max(0, subtotal - discount);

  const productWithAdvance = lineItems.find((li) => li.product.advancePercent || li.product.advanceAmount)?.product;
  const advanceDueNow = computeAdvanceDueNow({
    productSubtotal,
    discount,
    addOnAndFeesTotal: addOnTotal,
    productWithAdvance,
  });

  return {
    items: lineItems.map((li) => ({
      productId: li.product.id,
      title: li.product.title,
      variant: li.variant ? { id: li.variant.id, name: li.variant.name } : null,
      addOns: li.addOns.map((a) => ({ id: a.id, name: a.name, price: a.price })),
      qty: li.cartItem.qty,
      unitPrice: li.unitPrice,
      subtotal: li.subtotal,
    })),
    subtotal,
    addOnTotal,
    discount,
    couponCode: appliedCoupon,
    total,
    advanceDueNow,
    advancePercent: productWithAdvance?.advancePercent ? Number(productWithAdvance.advancePercent) : productWithAdvance?.advanceAmount ? null : 50,
  };
}

// GET /checkout/eligible-coupons — coupons the customer could apply to their
// cart right now (including new-user-only ones for first-time customers),
// so checkout can surface them proactively instead of the customer having to
// already know a code.
export async function listEligibleCoupons(userId, { cityId } = {}) {
  const { subtotal, addOnTotal, categoryIds } = await priceCart(userId);
  return getEligibleCoupons(userId, { subtotal, productSubtotal: subtotal - addOnTotal, categoryIds, cityId });
}

// Reserves slot capacity for the duration of checkout so two customers can't
// both "confirm" the last slot at the same time — released on failure/expiry,
// converted to a real booking once payment succeeds.
async function holdSlot({ cityId, timeSlotId, eventDate }) {
  if (!timeSlotId) return null;

  const slot = await prisma.timeSlot.findUnique({ where: { id: timeSlotId } });
  if (!slot) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Time slot not found');

  return prisma.$transaction(async (tx) => {
    const [booking, activeHolds] = await Promise.all([
      tx.slotBooking.findUnique({ where: { date_timeSlotId_cityId: { date: eventDate, timeSlotId, cityId } } }),
      tx.slotHold.count({ where: { date: eventDate, timeSlotId, cityId, status: 'ACTIVE', expiresAt: { gt: new Date() } } }),
    ]);

    const taken = (booking?.bookedCount || 0) + activeHolds;
    if (taken >= slot.capacity) {
      throw apiError(409, ERROR_CODES.CONFLICT, 'This time slot just filled up — please pick another one');
    }

    return tx.slotHold.create({
      data: {
        date: eventDate,
        timeSlotId,
        cityId,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + SLOT_HOLD_MINUTES * 60 * 1000),
      },
    });
  });
}

// POST /checkout/orders — the real thing: prices the cart fresh, holds the
// slot, creates the Order + OrderItems (with a full pricing/product/add-on
// snapshot so later catalog edits never change what a past order shows), and
// opens a Razorpay order for the amount actually due right now (full price,
// or the product's advance amount for ADVANCE mode). Nothing is marked paid
// here — that only happens once payment.service.js verifies a real payment.
export async function createOrder(userId, { addressId, eventDate, timeSlotId, paymentMode = 'FULL', couponCode, customerNote }) {
  const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!address) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Address not found');

  const eventDateObj = new Date(`${eventDate}T00:00:00.000Z`);
  if (Number.isNaN(eventDateObj.getTime())) {
    throw apiError(422, ERROR_CODES.VALIDATION_ERROR, 'Invalid event date');
  }

  const { cart, lineItems, subtotal, addOnTotal, categoryIds } = await priceCart(userId);
  const productSubtotal = subtotal - addOnTotal;

  let discount = 0;
  let appliedCouponCode = null;
  if (couponCode) {
    const result = await validateCoupon(couponCode, { subtotal, productSubtotal, cityId: address.cityId, categoryIds, userId });
    discount = result.discount;
    appliedCouponCode = result.coupon.code;
  }

  const city = await prisma.city.findUnique({ where: { id: address.cityId } });
  const deliveryCharge = Number(city?.deliveryCharge || 0);

  const slotHold = await holdSlot({ cityId: address.cityId, timeSlotId, eventDate: eventDateObj });
  const surgeCharge = slotHold
    ? Number((await prisma.timeSlot.findUnique({ where: { id: timeSlotId } }))?.surgeCharge || 0)
    : 0;

  const total = Math.max(0, subtotal - discount) + deliveryCharge + surgeCharge;

  const productWithAdvance = lineItems.find((li) => li.product.advancePercent || li.product.advanceAmount)?.product;
  let amountDueNow = total;
  if (paymentMode === 'ADVANCE') {
    amountDueNow = computeAdvanceDueNow({
      productSubtotal,
      discount,
      addOnAndFeesTotal: addOnTotal + deliveryCharge + surgeCharge,
      productWithAdvance,
    });
  }

  const order = await prisma.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId,
      status: 'PENDING_PAYMENT',
      eventDate: eventDateObj,
      timeSlotId: timeSlotId || undefined,
      cityId: address.cityId,
      addressSnapshot: {
        fullName: address.fullName,
        phone: address.phone,
        line1: address.line1,
        line2: address.line2,
        landmark: address.landmark,
        pincode: address.pincode,
        cityName: city?.name,
      },
      subtotal,
      addOnTotal: lineItems.reduce((sum, li) => sum + li.addOns.reduce((s, a) => s + Number(a.price), 0) * li.cartItem.qty, 0),
      deliveryCharge,
      surgeCharge,
      couponCode: appliedCouponCode || undefined,
      discount,
      total,
      amountDue: amountDueNow,
      paymentMode,
      source: 'WEB',
      customerNote: customerNote || undefined,
      items: {
        create: lineItems.map((li) => ({
          productId: li.product.id,
          qty: li.cartItem.qty,
          unitPrice: li.unitPrice,
          subtotal: li.subtotal,
          productSnapshot: {
            title: li.product.title,
            slug: li.product.slug,
            price: li.product.price,
            variant: li.variant ? { id: li.variant.id, name: li.variant.name, swatches: li.variant.swatches } : null,
          },
          addOnsSnapshot: li.addOns.map((a) => ({ id: a.id, name: a.name, price: a.price })),
        })),
      },
    },
    include: { items: true },
  });

  if (slotHold) {
    await prisma.slotHold.update({ where: { id: slotHold.id }, data: { orderId: order.id } });
  }

  let razorpayOrder = null;
  try {
    razorpayOrder = await createRazorpayOrder({
      amountRupees: amountDueNow,
      receipt: order.orderNumber,
      notes: { orderId: order.id, userId },
    });
  } catch (err) {
    // Razorpay not configured (or briefly down) — the order still exists in
    // PENDING_PAYMENT so the customer can retry payment once it's fixed,
    // rather than losing their cart/slot hold entirely.
    if (err.code !== ERROR_CODES.NOT_CONFIGURED) throw err;
  }

  if (razorpayOrder) {
    await prisma.payment.create({
      data: {
        orderId: order.id,
        razorpayOrderId: razorpayOrder.id,
        amount: amountDueNow,
        status: 'CREATED',
      },
    });
  }

  return {
    order,
    razorpayOrder,
    amountDueNow,
  };
}
