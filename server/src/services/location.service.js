import { prisma } from '../config/db.js';
import * as cache from '../utils/cache.js';

const CACHE_PREFIX = 'pincode:';
const CACHE_TTL_MS = 10 * 60 * 1000;

// The single source of truth for "can we serve this pincode?" — product page,
// cart, checkout, /payments/order, /payments/verify, and the webhook handler
// must all call this rather than reimplementing the check.
export async function checkServiceability(pincodeCode, cityId) {
  const cacheKey = `${CACHE_PREFIX}${pincodeCode}:${cityId || ''}`;
  const cached = cache.get(cacheKey);
  if (cached !== undefined) return cached;

  const pincode = await prisma.pincode.findFirst({
    where: {
      code: pincodeCode,
      deletedAt: null,
      ...(cityId ? { cityId } : {}),
    },
    include: { city: true },
  });

  let result;

  if (!pincode || !pincode.isServiceable || !pincode.city.isServiceable || pincode.city.deletedAt) {
    const nearestCity = await prisma.city.findFirst({
      where: { isServiceable: true, deletedAt: null },
      orderBy: { position: 'asc' },
      select: { id: true, name: true, slug: true },
    });

    result = {
      serviceable: false,
      nearestCity,
      message: 'Abhi hum yahan available nahi hain',
      waitlistEnabled: true,
    };
  } else {
    result = {
      serviceable: true,
      city: { id: pincode.city.id, name: pincode.city.name, slug: pincode.city.slug },
      areaName: pincode.areaName,
      deliveryCharge: Number(pincode.city.deliveryCharge) + Number(pincode.extraDeliveryCharge),
      minOrderValue: Number(pincode.city.minOrderValue),
      message: `We serve ${pincode.areaName || pincode.city.name}, ${pincode.city.name}`,
    };
  }

  cache.set(cacheKey, result, CACHE_TTL_MS);
  return result;
}

export function invalidateServiceabilityCache() {
  cache.invalidateByPrefix(CACHE_PREFIX);
}
