import { prisma } from '../config/db.js';
import { ERROR_CODES } from '../config/constants.js';
import { nowUTC } from '../utils/datetime.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

// Orders that never actually completed checkout (payment never came through,
// or the customer cancelled) shouldn't count as "this customer has ordered
// before" or "this customer already used this coupon" — otherwise an
// abandoned/failed payment permanently locks someone out of a first-order
// coupon they never actually benefited from.
const REAL_ORDER_STATUS_FILTER = { notIn: ['CANCELLED', 'PENDING_PAYMENT'] };

// Validates a coupon against the given cart context and returns the actual
// discount amount — used both by the "Apply" button (validate only) and by
// order creation (validate + get the amount to charge). Never mutates
// usedCount here; that only happens once the order this discount was applied
// to actually gets paid (see checkout.service.js).
//
// The discount itself only ever applies to the decoration/product price
// (`productSubtotal`), never to add-ons — same rule as the advance-payment
// split in checkout.service.js: add-ons are pass-through costs (cake,
// flowers) that a coupon shouldn't discount. `subtotal` (product + add-ons)
// is still what minOrderValue gates against, since that's a "is this cart
// big enough" check, not a "what gets discounted" one.
export async function validateCoupon(code, { subtotal, productSubtotal, cityId, categoryIds, userId }) {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

  if (!coupon || !coupon.isActive) {
    throw apiError(404, ERROR_CODES.NOT_FOUND, 'Invalid coupon code');
  }

  const now = nowUTC();
  if (coupon.windowStart && now < coupon.windowStart) {
    throw apiError(422, ERROR_CODES.VALIDATION_ERROR, 'This coupon is not active yet');
  }
  if (coupon.windowEnd && now > coupon.windowEnd) {
    throw apiError(422, ERROR_CODES.VALIDATION_ERROR, 'This coupon has expired');
  }

  if (coupon.minOrderValue && subtotal < Number(coupon.minOrderValue)) {
    throw apiError(422, ERROR_CODES.VALIDATION_ERROR, `Minimum order value for this coupon is ₹${coupon.minOrderValue}`);
  }

  if (coupon.applicableCityIds.length > 0 && !coupon.applicableCityIds.includes(cityId)) {
    throw apiError(422, ERROR_CODES.VALIDATION_ERROR, 'This coupon is not valid in your city');
  }

  if (coupon.applicableCategoryIds.length > 0) {
    const matches = categoryIds.some((id) => coupon.applicableCategoryIds.includes(id));
    if (!matches) throw apiError(422, ERROR_CODES.VALIDATION_ERROR, 'This coupon does not apply to items in your cart');
  }

  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw apiError(422, ERROR_CODES.VALIDATION_ERROR, 'This coupon has reached its usage limit');
  }

  if (coupon.perUserLimit) {
    const userUsage = await prisma.order.count({
      where: { userId, couponCode: coupon.code, status: REAL_ORDER_STATUS_FILTER },
    });
    if (userUsage >= coupon.perUserLimit) {
      throw apiError(422, ERROR_CODES.VALIDATION_ERROR, 'You have already used this coupon the maximum number of times');
    }
  }

  if (coupon.newUserOnly || coupon.minRepeatOrders) {
    const priorOrderCount = await prisma.order.count({
      where: { userId, status: REAL_ORDER_STATUS_FILTER },
    });
    if (coupon.newUserOnly && priorOrderCount > 0) {
      throw apiError(422, ERROR_CODES.VALIDATION_ERROR, 'This coupon is only valid for your first order');
    }
    if (coupon.minRepeatOrders && priorOrderCount < coupon.minRepeatOrders) {
      throw apiError(
        422,
        ERROR_CODES.VALIDATION_ERROR,
        `This coupon unlocks after ${coupon.minRepeatOrders} completed order${coupon.minRepeatOrders > 1 ? 's' : ''} — you have ${priorOrderCount} so far`
      );
    }
  }

  const rawDiscount =
    coupon.type === 'PERCENTAGE' ? (productSubtotal * Number(coupon.value)) / 100 : Number(coupon.value);
  const cappedDiscount = coupon.maxDiscount ? Math.min(rawDiscount, Number(coupon.maxDiscount)) : rawDiscount;
  const discount = Math.min(cappedDiscount, productSubtotal); // never discount more than the product itself costs

  return { coupon, discount: Math.round(discount * 100) / 100 };
}

// GET /checkout/eligible-coupons — active coupons the logged-in customer
// could apply to their cart right now, so checkout can surface "you qualify
// for WELCOME50" instead of relying on the customer already knowing a code.
// Applies the same eligibility rules as validateCoupon (window, min order,
// usage limits, new-user-only) but silently skips anything that doesn't
// qualify instead of throwing — this is a "what's available" listing, not a
// single-code validation.
export async function getEligibleCoupons(userId, { subtotal, productSubtotal, categoryIds = [], cityId }) {
  const now = nowUTC();

  const candidates = await prisma.coupon.findMany({
    where: {
      isActive: true,
      OR: [{ windowStart: null }, { windowStart: { lte: now } }],
      AND: [{ OR: [{ windowEnd: null }, { windowEnd: { gte: now } }] }],
    },
  });

  const needsOrderCount = candidates.some((c) => c.newUserOnly || c.minRepeatOrders);
  const priorOrderCount = needsOrderCount
    ? await prisma.order.count({ where: { userId, status: REAL_ORDER_STATUS_FILTER } })
    : 0;

  const eligible = [];
  for (const coupon of candidates) {
    if (coupon.minOrderValue && subtotal < Number(coupon.minOrderValue)) continue;
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) continue;
    if (coupon.newUserOnly && priorOrderCount > 0) continue;
    if (coupon.minRepeatOrders && priorOrderCount < coupon.minRepeatOrders) continue;
    if (coupon.applicableCityIds.length > 0 && !coupon.applicableCityIds.includes(cityId)) continue;
    if (coupon.applicableCategoryIds.length > 0 && !categoryIds.some((id) => coupon.applicableCategoryIds.includes(id))) continue;

    if (coupon.perUserLimit) {
      const userUsage = await prisma.order.count({
        where: { userId, couponCode: coupon.code, status: REAL_ORDER_STATUS_FILTER },
      });
      if (userUsage >= coupon.perUserLimit) continue;
    }

    const rawDiscount =
      coupon.type === 'PERCENTAGE' ? (productSubtotal * Number(coupon.value)) / 100 : Number(coupon.value);
    const cappedDiscount = coupon.maxDiscount ? Math.min(rawDiscount, Number(coupon.maxDiscount)) : rawDiscount;
    const discount = Math.min(cappedDiscount, productSubtotal);

    eligible.push({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      maxDiscount: coupon.maxDiscount,
      minOrderValue: coupon.minOrderValue,
      newUserOnly: coupon.newUserOnly,
      minRepeatOrders: coupon.minRepeatOrders,
      estimatedDiscount: Math.round(discount * 100) / 100,
    });
  }

  return eligible;
}
