import * as checkoutService from '../services/checkout.service.js';
import * as paymentCheckoutService from '../services/payment.checkout.service.js';
import { success } from '../utils/apiResponse.js';
import * as settings from '../config/settings.service.js';

export const preview = async (req, res) => {
  const data = await checkoutService.previewOrder(req.user.sub, req.validatedQuery);
  return success(res, { data, message: 'Order preview calculated' });
};

export const eligibleCoupons = async (req, res) => {
  const data = await checkoutService.listEligibleCoupons(req.user.sub, { cityId: req.query.cityId }).catch((err) => {
    if (err.code === 'VALIDATION_ERROR') return []; // empty cart — nothing to offer yet
    throw err;
  });
  return success(res, { data, message: 'Eligible coupons fetched' });
};

export const createOrder = async (req, res) => {
  const result = await checkoutService.createOrder(req.user.sub, req.body);
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
  const order = await checkoutService.getOrderForUser(req.user.sub, req.params.orderId);
  return success(res, { data: order, message: 'Order fetched' });
};

export const listMyOrders = async (req, res) => {
  const orders = await checkoutService.listOrdersForUser(req.user.sub);
  return success(res, { data: orders, message: 'Orders fetched' });
};

export const getMyOrderDetail = async (req, res) => {
  const order = await checkoutService.getOrderDetailForUser(req.user.sub, req.params.orderId);
  return success(res, { data: order, message: 'Order fetched' });
};

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
