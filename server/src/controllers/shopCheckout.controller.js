import * as shopCheckoutService from '../services/shopCheckout.service.js';
import * as paymentCheckoutService from '../services/payment.checkout.service.js';
import { success } from '../utils/apiResponse.js';
import * as settings from '../config/settings.service.js';

export const preview = async (req, res) => {
  const data = await shopCheckoutService.previewOrder(req.user.sub);
  return success(res, { data, message: 'Order preview calculated' });
};

export const createOrder = async (req, res) => {
  const result = await shopCheckoutService.createOrder(req.user.sub, req.body);
  return success(res, {
    status: 201,
    data: {
      orderId: result.order.id,
      orderNumber: result.order.orderNumber,
      amountDueNow: result.amountDueNow,
      razorpayOrder: result.razorpayOrder,
      razorpayKeyId: result.razorpayOrder ? settings.getGroup('PAYMENT').keyId : null,
    },
    message: 'Order created',
  });
};

export const getOrder = async (req, res) => {
  const order = await shopCheckoutService.getOrderForUser(req.user.sub, req.params.orderId);
  return success(res, { data: order, message: 'Order fetched' });
};

export const listMyOrders = async (req, res) => {
  const orders = await shopCheckoutService.listOrdersForUser(req.user.sub);
  return success(res, { data: orders, message: 'Orders fetched' });
};

export const getMyOrderDetail = async (req, res) => {
  const order = await shopCheckoutService.getOrderDetailForUser(req.user.sub, req.params.orderId);
  return success(res, { data: order, message: 'Order fetched' });
};

// Payment verification and cancellation are order-kind-agnostic now that
// BOOKING and SHOP orders share the same Order/Payment tables — both
// checkout controllers delegate to the same payment.checkout.service.js.
export const verifyPayment = async (req, res) => {
  const order = await paymentCheckoutService.verifyPayment(req.user.sub, req.params.orderId, req.body);
  return success(res, { data: order, message: 'Payment verified' });
};

export const cancelOrder = async (req, res) => {
  await paymentCheckoutService.cancelUnpaidOrder(req.user.sub, req.params.orderId);
  return success(res, { message: 'Order cancelled' });
};

export const cancelPaidOrder = async (req, res) => {
  const order = await paymentCheckoutService.cancelPaidOrder(req.user.sub, req.params.orderId, req.body.reason);
  return success(res, { data: order, message: 'Order cancelled' });
};
