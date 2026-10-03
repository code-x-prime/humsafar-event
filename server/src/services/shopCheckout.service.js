import { prisma } from '../config/db.js';
import { ERROR_CODES } from '../config/constants.js';
import { generateUniqueOrderNumber } from '../utils/orderNumber.js';
import { cancelStalePendingOrders } from './payment.checkout.service.js';
import { createRazorpayOrder } from '../lib/razorpay.js';
import * as settings from '../config/settings.service.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

export async function getOrderForUser(userId, orderId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId, kind: 'SHOP' },
    select: { orderNumber: true, status: true, total: true, amountPaid: true, createdAt: true },
  });
  if (!order) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Order not found');
  return order;
}

export async function listOrdersForUser(userId) {
  // Only orders that were actually placed: an attempt abandoned before paying
  // (still PENDING_PAYMENT, or cancelled without any money taken) never became
  // an order and shouldn't be listed as one.
  const orders = await prisma.order.findMany({
    where: {
      userId,
      kind: 'SHOP',
      NOT: [{ status: 'PENDING_PAYMENT' }, { status: 'CANCELLED', amountPaid: 0 }],
    },
    orderBy: { createdAt: 'desc' },
    include: { items: true, shipment: { select: { status: true, awbCode: true, trackingUrl: true, courierName: true } } },
  });

  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    total: o.total,
    amountPaid: o.amountPaid,
    itemCount: o.items.length,
    thumbnailTitle: o.items[0]?.productSnapshot?.title,
    shipment: o.shipment,
    createdAt: o.createdAt,
  }));
}

export async function getOrderDetailForUser(userId, orderId) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId, kind: 'SHOP' },
    include: {
      items: true,
      payments: { orderBy: { createdAt: 'desc' } },
      shipment: true,
    },
  });
  if (!order) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Order not found');

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    addressSnapshot: order.addressSnapshot,
    subtotal: order.subtotal,
    shippingCharge: order.shippingCharge,
    discount: order.discount,
    taxAmount: order.taxAmount,
    total: order.total,
    amountPaid: order.amountPaid,
    customerNote: order.customerNote,
    cancelReason: order.cancelReason,
    createdAt: order.createdAt,
    items: order.items.map((i) => ({
      id: i.id,
      productId: i.shopProductId,
      productSlug: i.productSnapshot?.slug,
      title: i.productSnapshot?.title,
      image: i.productSnapshot?.image,
      qty: i.qty,
      unitPrice: i.unitPrice,
      subtotal: i.subtotal,
    })),
    payments: order.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      method: p.method,
      createdAt: p.createdAt,
    })),
    shipment: order.shipment
      ? {
          status: order.shipment.status,
          awbCode: order.shipment.awbCode,
          courierName: order.shipment.courierName,
          trackingUrl: order.shipment.trackingUrl,
          pickupScheduledAt: order.shipment.pickupScheduledAt,
          deliveredAt: order.shipment.deliveredAt,
        }
      : null,
  };
}

async function priceCart(userId) {
  const cart = await prisma.cart.findFirst({
    where: { userId },
    include: {
      items: {
        where: { shopProductId: { not: null } }, // Shop With Us lines only — decoration-booking lines are priced by checkout.service.js
        include: {
          shopProduct: { include: { media: { where: { isPrimary: true }, take: 1, select: { url: true } } } },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw apiError(422, ERROR_CODES.VALIDATION_ERROR, 'Your cart is empty');
  }

  const inactiveItem = cart.items.find((item) => !item.shopProduct.isActive);
  if (inactiveItem) {
    throw apiError(422, ERROR_CODES.VALIDATION_ERROR, `"${inactiveItem.shopProduct.title}" is no longer available`);
  }

  const insufficientStock = cart.items.find((item) => item.shopProduct.stock < item.qty);
  if (insufficientStock) {
    throw apiError(
      422,
      ERROR_CODES.VALIDATION_ERROR,
      `Only ${insufficientStock.shopProduct.stock} of "${insufficientStock.shopProduct.title}" left in stock`
    );
  }

  const lineItems = cart.items.map((item) => ({
    cartItem: item,
    product: item.shopProduct,
    unitPrice: Number(item.shopProduct.price),
    subtotal: Number(item.shopProduct.price) * item.qty,
  }));

  const subtotal = lineItems.reduce((sum, li) => sum + li.subtotal, 0);
  const totalWeightGrams = lineItems.reduce((sum, li) => sum + (li.product.weightGrams || 200) * li.cartItem.qty, 0);

  return { cart, lineItems, subtotal, totalWeightGrams };
}

// GET /shop/checkout/preview — priced breakdown before payment, no side effects.
export async function previewOrder(userId) {
  const { lineItems, subtotal } = await priceCart(userId);
  const taxPercent = Number(settings.get('shopTaxPercent', 0)) || 0;
  const taxAmount = Math.round(subtotal * (taxPercent / 100) * 100) / 100;
  const shippingCharge = 0; // flat free shipping for now — Shiprocket-live rate quoting is a later enhancement
  const total = subtotal + taxAmount + shippingCharge;

  return {
    items: lineItems.map((li) => ({
      productId: li.product.id,
      title: li.product.title,
      qty: li.cartItem.qty,
      unitPrice: li.unitPrice,
      subtotal: li.subtotal,
    })),
    subtotal,
    taxPercent,
    taxAmount,
    shippingCharge,
    total,
  };
}

// POST /shop/checkout/orders — prices the cart fresh, opens a Razorpay order
// for the total, then creates the unified Order (kind=SHOP) + OrderItems with
// a full product snapshot and its Payment row. Nothing is marked paid or
// shipped here — that happens once payment.checkout.service.js verifies a
// real payment.
export async function createOrder(userId, { addressId, customerNote }) {
  const address = await prisma.shopAddress.findFirst({ where: { id: addressId, userId } });
  if (!address) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Address not found');

  const { lineItems, subtotal } = await priceCart(userId);

  const taxPercent = Number(settings.get('shopTaxPercent', 0)) || 0;
  const taxAmount = Math.round(subtotal * (taxPercent / 100) * 100) / 100;
  const shippingCharge = 0;
  const total = Math.round((subtotal + taxAmount + shippingCharge) * 100) / 100;

  // Razorpay can't charge less than ₹1.
  if (total < 1) {
    throw apiError(422, ERROR_CODES.VALIDATION_ERROR, 'This order total is too low to pay online — please contact us to complete the order');
  }

  // An earlier unpaid attempt by this customer is replaced by this one, so
  // abandoned checkouts don't pile up in their history.
  await cancelStalePendingOrders(userId, 'SHOP');

  const orderNumber = await generateUniqueOrderNumber('HS');

  // The Razorpay order is opened before the Order row is written, so a gateway
  // failure leaves nothing behind — no unpaid order in the customer's history.
  let razorpayOrder;
  try {
    razorpayOrder = await createRazorpayOrder({ amountRupees: total, receipt: orderNumber, notes: { orderNumber, userId } });
  } catch (err) {
    if (err.code === ERROR_CODES.NOT_CONFIGURED) {
      throw apiError(503, ERROR_CODES.NOT_CONFIGURED, "Online payment isn't available right now — please contact us on WhatsApp to complete your order.");
    }
    throw err;
  }

  const order = await prisma.order.create({
    data: {
      orderNumber,
      kind: 'SHOP',
      userId,
      status: 'PENDING_PAYMENT',
      addressSnapshot: {
        fullName: address.fullName,
        phone: address.phone,
        line1: address.line1,
        line2: address.line2,
        landmark: address.landmark,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
      },
      subtotal,
      shippingCharge,
      taxAmount,
      total,
      customerNote: customerNote || undefined,
      items: {
        create: lineItems.map((li) => ({
          shopProductId: li.product.id,
          qty: li.cartItem.qty,
          unitPrice: li.unitPrice,
          subtotal: li.subtotal,
          productSnapshot: {
            title: li.product.title,
            slug: li.product.slug,
            price: li.product.price,
            image: li.product.media?.[0]?.url || null,
          },
        })),
      },
      payments: {
        create: { razorpayOrderId: razorpayOrder.id, amount: total, status: 'CREATED' },
      },
    },
    include: { items: true },
  });

  return { order, razorpayOrder, amountDueNow: total };
}

export async function cancelUnpaidOrder(userId, orderId) {
  const order = await prisma.order.findFirst({ where: { id: orderId, userId, kind: 'SHOP' } });
  if (!order) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Order not found');
  if (order.status !== 'PENDING_PAYMENT') {
    throw apiError(409, ERROR_CODES.CONFLICT, 'Only unpaid orders can be cancelled this way');
  }

  await prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
  return { cancelled: true };
}
