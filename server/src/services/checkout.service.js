import { prisma } from '../config/db.js';
import { ERROR_CODES } from '../config/constants.js';
import { nowIST } from '../utils/datetime.js';
import { isSlotTooSoon } from '../utils/slotTime.js';
import { generateUniqueOrderNumber } from '../utils/orderNumber.js';
import { validateCoupon, getEligibleCoupons } from './couponValidation.service.js';
import { cancelStalePendingOrders } from './payment.checkout.service.js';
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
    where: { id: orderId, userId, kind: 'BOOKING' },
    select: { orderNumber: true, status: true, total: true, amountPaid: true, amountDue: true, eventDate: true },
  });
  if (!order) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Order not found');
  return { ...order, eventDate: order.eventDate?.toISOString().slice(0, 10) };
}

// GET /checkout/my-orders — every booking a customer has placed, newest
// first, for the profile page's order history list. (Shop With Us orders
// have their own listing — see shopCheckout.service.js.)
export async function listOrdersForUser(userId) {
  // Only bookings that were actually placed: an attempt that was abandoned
  // before paying (still PENDING_PAYMENT, or cancelled without any money
  // taken) never became a booking and shouldn't be listed as one.
  const orders = await prisma.order.findMany({
    where: {
      userId,
      kind: 'BOOKING',
      NOT: [{ status: 'PENDING_PAYMENT' }, { status: 'CANCELLED', amountPaid: 0 }],
    },
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  });

  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    eventDate: o.eventDate?.toISOString().slice(0, 10),
    total: o.total,
    amountPaid: o.amountPaid,
    amountDue: o.amountDue,
    itemCount: o.items.length,
    thumbnailTitle: o.items[0]?.productSnapshot?.title,
    createdAt: o.createdAt,
  }));
}

// GET /checkout/my-orders/:orderId — full detail for one of the customer's
// own bookings (line items, address, payment status), for the profile
// page's order detail view.
export async function getOrderDetailForUser(userId, orderId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId, kind: 'BOOKING' },
    include: {
      items: true,
      payments: { orderBy: { createdAt: 'desc' } },
      city: { select: { name: true } },
    },
  });
  if (!order) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Order not found');

  const slot = order.timeSlotId
    ? await prisma.timeSlot.findUnique({ where: { id: order.timeSlotId }, select: { label: true, startTime: true, endTime: true } })
    : null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    eventDate: order.eventDate?.toISOString().slice(0, 10),
    timeSlot: slot ? { label: slot.label, startTime: slot.startTime, endTime: slot.endTime } : null,
    cityName: order.city?.name,
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
      notes: i.productSnapshot?.notes || null,
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

// Money amounts are carried as plain numbers; rounding to paise after each
// calculation keeps floating-point noise (0.1 + 0.2) out of what is charged.
const round2 = (n) => Math.round(n * 100) / 100;

// Builds the priced line items + totals from the user's current cart —
// shared by the "review my order" preview and the actual order-create step
// so the number the customer sees is guaranteed to be the number they're
// charged (both read the exact same cart + product/add-on prices at call time).
async function priceCart(userId) {
  const cart = await prisma.cart.findFirst({
    where: { userId },
    include: {
      items: {
        where: { productId: { not: null } }, // decoration-booking lines only — Shop With Us lines are priced by shopCheckout.service.js
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

  // An add-on that was switched off or deleted after the customer added it
  // must not be silently dropped (the price would change under them) or
  // silently charged — tell them so they can remove it.
  for (const item of cart.items) {
    if (item.addOnIds.some((id) => !addOnsById.get(id)?.isActive)) {
      throw apiError(422, ERROR_CODES.VALIDATION_ERROR, `An add-on for "${item.product.title}" is no longer available — please remove it from your cart and try again`);
    }
  }

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
export async function previewOrder(userId, { cityId, couponCode, timeSlotId }) {
  const { lineItems, subtotal, addOnTotal, categoryIds } = await priceCart(userId);
  const productSubtotal = subtotal - addOnTotal;

  let discount = 0;
  let appliedCoupon = null;

  if (couponCode) {
    const result = await validateCoupon(couponCode, { subtotal, productSubtotal, cityId, categoryIds, userId });
    discount = result.discount;
    appliedCoupon = result.coupon.code;
  }

  // The city's delivery charge and the chosen slot's surge charge are part of
  // what gets charged, so they are part of what is shown — otherwise the amount
  // on the checkout page and the amount Razorpay asks for would not match.
  const [city, slot] = await Promise.all([
    cityId ? prisma.city.findUnique({ where: { id: cityId }, select: { deliveryCharge: true } }) : null,
    timeSlotId ? prisma.timeSlot.findUnique({ where: { id: timeSlotId }, select: { surgeCharge: true, isActive: true, cityId: true } }) : null,
  ]);
  const deliveryCharge = Number(city?.deliveryCharge || 0);
  const slotUsable = slot && slot.isActive && (!slot.cityId || slot.cityId === cityId);
  const surgeCharge = slotUsable ? Number(slot.surgeCharge || 0) : 0;

  const total = round2(Math.max(0, subtotal - discount) + deliveryCharge + surgeCharge);

  const productWithAdvance = lineItems.find((li) => li.product.advancePercent || li.product.advanceAmount)?.product;
  const advanceDueNow = round2(
    computeAdvanceDueNow({
      productSubtotal,
      discount,
      addOnAndFeesTotal: addOnTotal + deliveryCharge + surgeCharge,
      productWithAdvance,
    })
  );

  return {
    items: lineItems.map((li) => ({
      productId: li.product.id,
      title: li.product.title,
      variant: li.variant ? { id: li.variant.id, name: li.variant.name } : null,
      notes: li.cartItem.notes || null,
      addOns: li.addOns.map((a) => ({ id: a.id, name: a.name, price: a.price })),
      qty: li.cartItem.qty,
      unitPrice: li.unitPrice,
      subtotal: li.subtotal,
    })),
    subtotal,
    addOnTotal,
    discount,
    deliveryCharge,
    surgeCharge,
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

// Checks that a booking can actually be taken for this date, city and slot —
// the booking page only offers valid choices, but the server can't assume the
// request came from that page. Rejects past dates, inactive or wrong-city
// slots, and dates the admin has blacked out.
async function assertBookable({ cityId, timeSlotId, eventDate }) {
  const today = nowIST().startOf('day').toDate();
  if (eventDate < today) {
    throw apiError(422, ERROR_CODES.VALIDATION_ERROR, 'Cannot book a date in the past');
  }

  const blackout = await prisma.slotBlackout.findFirst({
    where: {
      date: eventDate,
      AND: [
        { OR: [{ cityId }, { cityId: null }] },
        // A blackout with no slot closes the whole day; one with a slot closes only that slot.
        { OR: timeSlotId ? [{ timeSlotId: null }, { timeSlotId }] : [{ timeSlotId: null }] },
      ],
    },
  });
  if (blackout) {
    throw apiError(409, ERROR_CODES.CONFLICT, 'We are not taking bookings for that date or time — please pick another one');
  }
}

// Reserves slot capacity for the duration of checkout so two customers can't
// both "confirm" the last slot at the same time — released on failure/expiry,
// converted to a real booking once payment succeeds.
async function holdSlot({ cityId, timeSlotId, eventDate }) {
  if (!timeSlotId) return null;

  const slot = await prisma.timeSlot.findUnique({ where: { id: timeSlotId } });
  if (!slot || !slot.isActive || (slot.cityId && slot.cityId !== cityId)) {
    throw apiError(404, ERROR_CODES.NOT_FOUND, 'That time slot is not available');
  }
  if (isSlotTooSoon(eventDate, slot.startTime)) {
    throw apiError(409, ERROR_CODES.CONFLICT, 'That time slot is too close to start — please pick a later slot or day');
  }

  const hold = await prisma.$transaction(async (tx) => {
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

  return { hold, slot };
}

// POST /checkout/orders — the real thing: prices the cart fresh, holds the
// slot, opens the Razorpay order, and only then creates the Order + OrderItems
// (with a full pricing/product/add-on snapshot so later catalog edits never
// change what a past order shows) together with its Payment row. The order
// is written last so a payment-gateway failure leaves nothing behind — no
// unpaid order in the customer's history, no slot stuck on hold. The amount
// charged is the amount due right now (full price, or the product's advance
// amount for ADVANCE mode). Nothing is marked paid here — that only happens
// once a real payment is verified (payment.checkout.service.js).
export async function createOrder(userId, { addressId, eventDate, timeSlotId, paymentMode = 'FULL', couponCode, customerNote }) {
  const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
  if (!address) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Address not found');

  const eventDateObj = new Date(`${eventDate}T00:00:00.000Z`);
  if (Number.isNaN(eventDateObj.getTime())) {
    throw apiError(422, ERROR_CODES.VALIDATION_ERROR, 'Invalid event date');
  }

  const { lineItems, subtotal, addOnTotal, categoryIds } = await priceCart(userId);
  const productSubtotal = subtotal - addOnTotal;

  await assertBookable({ cityId: address.cityId, timeSlotId, eventDate: eventDateObj });

  // If this city has time slots, one has to be chosen — booking without one
  // would skip the capacity limit and the slot's surge charge. A city with no
  // slots set up simply books without one.
  if (!timeSlotId) {
    const configuredSlots = await prisma.timeSlot.count({
      where: { isActive: true, OR: [{ cityId: address.cityId }, { cityId: null }] },
    });
    if (configuredSlots > 0) {
      throw apiError(422, ERROR_CODES.VALIDATION_ERROR, 'Please choose a time slot for your booking');
    }
  }

  let discount = 0;
  let appliedCouponCode = null;
  if (couponCode) {
    const result = await validateCoupon(couponCode, { subtotal, productSubtotal, cityId: address.cityId, categoryIds, userId });
    discount = result.discount;
    appliedCouponCode = result.coupon.code;
  }

  const city = await prisma.city.findUnique({ where: { id: address.cityId } });
  const deliveryCharge = Number(city?.deliveryCharge || 0);

  // Earlier unpaid attempts by this customer go first, so their slot holds
  // can't block the slot they are about to book again.
  await cancelStalePendingOrders(userId, 'BOOKING');

  const held = await holdSlot({ cityId: address.cityId, timeSlotId, eventDate: eventDateObj });
  const slotHold = held?.hold ?? null;
  const surgeCharge = Number(held?.slot.surgeCharge || 0);

  try {
    const total = round2(Math.max(0, subtotal - discount) + deliveryCharge + surgeCharge);

    const productWithAdvance = lineItems.find((li) => li.product.advancePercent || li.product.advanceAmount)?.product;
    let amountDueNow = total;
    if (paymentMode === 'ADVANCE') {
      amountDueNow = round2(
        computeAdvanceDueNow({
          productSubtotal,
          discount,
          addOnAndFeesTotal: addOnTotal + deliveryCharge + surgeCharge,
          productWithAdvance,
        })
      );
    }

    // Razorpay can't charge less than ₹1 — a coupon that wipes out the whole
    // price would otherwise fail with an unhelpful gateway error.
    if (amountDueNow < 1) {
      throw apiError(422, ERROR_CODES.VALIDATION_ERROR, 'This order total is too low to pay online — please contact us to complete the booking');
    }

    const orderNumber = await generateUniqueOrderNumber('HE');

    let razorpayOrder;
    try {
      razorpayOrder = await createRazorpayOrder({ amountRupees: amountDueNow, receipt: orderNumber, notes: { orderNumber, userId } });
    } catch (err) {
      if (err.code === ERROR_CODES.NOT_CONFIGURED) {
        throw apiError(503, ERROR_CODES.NOT_CONFIGURED, "Online payment isn't available right now — please contact us on WhatsApp to complete your booking.");
      }
      throw err;
    }

    const order = await prisma.order.create({
      data: {
        orderNumber,
        kind: 'BOOKING',
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
              // The customer's own colour request from the product page.
              notes: li.cartItem.notes || null,
            },
            addOnsSnapshot: li.addOns.map((a) => ({ id: a.id, name: a.name, price: a.price })),
          })),
        },
        payments: {
          create: { razorpayOrderId: razorpayOrder.id, amount: amountDueNow, status: 'CREATED' },
        },
      },
      include: { items: true },
    });

    if (slotHold) {
      await prisma.slotHold.update({ where: { id: slotHold.id }, data: { orderId: order.id } });
    }

    return { order, razorpayOrder, amountDueNow };
  } catch (err) {
    // Nothing was created (or only part of it) — free the slot straight away
    // instead of leaving it held for the full 15 minutes.
    if (slotHold) {
      await prisma.slotHold.update({ where: { id: slotHold.id }, data: { status: 'RELEASED' } }).catch(() => {});
    }
    throw err;
  }
}
