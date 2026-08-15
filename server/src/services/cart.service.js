import { prisma } from '../config/db.js';
import { ERROR_CODES } from '../config/constants.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

const ITEM_INCLUDE = {
  product: {
    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      mrp: true,
      isActive: true,
      media: { where: { isPrimary: true }, take: 1, select: { url: true } },
    },
  },
  shopProduct: {
    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      mrp: true,
      stock: true,
      isActive: true,
      media: { where: { isPrimary: true }, take: 1, select: { url: true } },
    },
  },
  variant: { select: { id: true, name: true, swatches: true } },
};

function withAddOnDetails(cart, addOnsById) {
  return {
    ...cart,
    items: cart.items.map((item) => ({
      ...item,
      addOns: item.addOnIds.map((id) => addOnsById.get(id)).filter(Boolean),
    })),
  };
}

async function attachAddOns(cart) {
  const addOnIds = [...new Set(cart.items.flatMap((item) => item.addOnIds))];
  if (addOnIds.length === 0) return withAddOnDetails(cart, new Map());

  const addOns = await prisma.addOn.findMany({ where: { id: { in: addOnIds } } });
  const addOnsById = new Map(addOns.map((a) => [a.id, a]));
  return withAddOnDetails(cart, addOnsById);
}

// Identifies which cart a request belongs to: the logged-in user's cart if
// authenticated, otherwise the cart tied to their guest session id. Creates
// one if it doesn't exist yet — every cart operation starts here. One cart
// holds a mix of decoration-booking items (product) and Shop With Us items
// (shopProduct); the two are only ever separated at checkout time.
async function getOrCreateCart({ userId, guestSessionId }) {
  if (!userId && !guestSessionId) {
    throw apiError(400, ERROR_CODES.VALIDATION_ERROR, 'Missing guest session id');
  }

  const where = userId ? { userId } : { guestSessionId };
  let cart = await prisma.cart.findFirst({ where, include: { items: { include: ITEM_INCLUDE, orderBy: { createdAt: 'asc' } } } });

  if (!cart) {
    cart = await prisma.cart.create({
      data: userId ? { userId } : { guestSessionId },
      include: { items: { include: ITEM_INCLUDE, orderBy: { createdAt: 'asc' } } },
    });
  }

  return cart;
}

export async function getCart(identity) {
  const cart = await getOrCreateCart(identity);
  return attachAddOns(cart);
}

// Adds a decoration-booking product to the cart. If an identical line (same
// product + same add-on selection + same event date/slot/city) already
// exists, its qty is increased instead of creating a duplicate row.
export async function addItem(identity, { productId, variantId, addOnIds = [], qty = 1, eventDate, timeSlotId, cityId, notes }) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Product not found');

  if (variantId) {
    const variant = await prisma.productVariant.findFirst({ where: { id: variantId, productId } });
    if (!variant) throw apiError(422, ERROR_CODES.VALIDATION_ERROR, 'Invalid color option for this product');
  }

  const cart = await getOrCreateCart(identity);
  const sortedAddOnIds = [...addOnIds].sort();

  const existing = cart.items.find(
    (item) =>
      item.productId === productId &&
      item.variantId === (variantId || null) &&
      JSON.stringify([...item.addOnIds].sort()) === JSON.stringify(sortedAddOnIds) &&
      (item.eventDate ? item.eventDate.toISOString() : null) === (eventDate || null) &&
      item.timeSlotId === (timeSlotId || null) &&
      item.cityId === (cityId || null)
  );

  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { qty: existing.qty + qty } });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        variantId: variantId || undefined,
        addOnIds: sortedAddOnIds,
        qty,
        eventDate: eventDate ? new Date(eventDate) : undefined,
        timeSlotId: timeSlotId || undefined,
        cityId: cityId || undefined,
        notes: notes || undefined,
      },
    });
  }

  return getCart(identity);
}

// Adds a Shop With Us product to the cart. Simpler than addItem above — no
// variants/add-ons/event fields, dedupes purely on shopProductId.
export async function addShopItem(identity, { productId, qty = 1 }) {
  const product = await prisma.shopProduct.findUnique({ where: { id: productId } });
  if (!product || !product.isActive) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Product not found');

  const cart = await getOrCreateCart(identity);
  const existing = cart.items.find((item) => item.shopProductId === productId);

  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { qty: existing.qty + qty } });
  } else {
    await prisma.cartItem.create({ data: { cartId: cart.id, shopProductId: productId, qty } });
  }

  return getCart(identity);
}

export async function updateItem(identity, itemId, data) {
  const cart = await getOrCreateCart(identity);
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Cart item not found');

  const patch = {};
  if (data.qty !== undefined) patch.qty = Math.max(1, data.qty);
  if (data.variantId !== undefined) patch.variantId = data.variantId;
  if (data.addOnIds !== undefined) patch.addOnIds = data.addOnIds;
  if (data.eventDate !== undefined) patch.eventDate = data.eventDate ? new Date(data.eventDate) : null;
  if (data.timeSlotId !== undefined) patch.timeSlotId = data.timeSlotId;
  if (data.cityId !== undefined) patch.cityId = data.cityId;
  if (data.notes !== undefined) patch.notes = data.notes;

  await prisma.cartItem.update({ where: { id: itemId }, data: patch });
  return getCart(identity);
}

export async function removeItem(identity, itemId) {
  const cart = await getOrCreateCart(identity);
  const item = cart.items.find((i) => i.id === itemId);
  if (!item) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Cart item not found');

  await prisma.cartItem.delete({ where: { id: itemId } });
  return getCart(identity);
}

// Called right after login: folds the guest cart's items into the user's
// cart (merging qty for identical lines, same as addItem/addShopItem), then
// discards the now-empty guest cart so nothing is left behind under the old
// session id.
export async function mergeGuestCart(userId, guestSessionId) {
  if (!guestSessionId) return getCart({ userId });

  const guestCart = await prisma.cart.findFirst({
    where: { guestSessionId },
    include: { items: true },
  });

  if (guestCart && guestCart.items.length > 0) {
    for (const item of guestCart.items) {
      if (item.shopProductId) {
        await addShopItem({ userId }, { productId: item.shopProductId, qty: item.qty });
      } else {
        await addItem(
          { userId },
          {
            productId: item.productId,
            variantId: item.variantId || undefined,
            addOnIds: item.addOnIds,
            qty: item.qty,
            eventDate: item.eventDate?.toISOString(),
            timeSlotId: item.timeSlotId || undefined,
            cityId: item.cityId || undefined,
            notes: item.notes || undefined,
          }
        );
      }
    }
  }

  if (guestCart) {
    await prisma.cart.delete({ where: { id: guestCart.id } });
  }

  return getCart({ userId });
}
