import * as cartService from '../services/cart.service.js';
import { success } from '../utils/apiResponse.js';
import { error } from '../utils/apiResponse.js';
import { ERROR_CODES } from '../config/constants.js';

// Guest carts are identified by a client-generated id sent on this header
// (persisted in localStorage on the client) — logged-in requests use the
// verified user id instead and ignore the header entirely.
function getIdentity(req) {
  if (req.user) return { userId: req.user.sub };

  const guestSessionId = req.headers['x-guest-session-id'];
  if (!guestSessionId) return null;
  return { guestSessionId };
}

function requireIdentity(req, res) {
  const identity = getIdentity(req);
  if (!identity) {
    error(res, {
      status: 400,
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Missing x-guest-session-id header for a guest request',
    });
    return null;
  }
  return identity;
}

export const getCart = async (req, res) => {
  const identity = requireIdentity(req, res);
  if (!identity) return;
  const cart = await cartService.getCart(identity);
  return success(res, { data: cart, message: 'Cart fetched' });
};

export const addItem = async (req, res) => {
  const identity = requireIdentity(req, res);
  if (!identity) return;
  const cart = await cartService.addItem(identity, req.body);
  return success(res, { status: 201, data: cart, message: 'Added to cart' });
};

export const updateItem = async (req, res) => {
  const identity = requireIdentity(req, res);
  if (!identity) return;
  const cart = await cartService.updateItem(identity, req.params.itemId, req.body);
  return success(res, { data: cart, message: 'Cart updated' });
};

export const removeItem = async (req, res) => {
  const identity = requireIdentity(req, res);
  if (!identity) return;
  const cart = await cartService.removeItem(identity, req.params.itemId);
  return success(res, { data: cart, message: 'Removed from cart' });
};

// POST /cart/merge — called once right after a guest logs in. req.user is
// guaranteed present (this route requires auth); the guest session id is
// still read from the header so we know which guest cart to fold in.
export const mergeGuestCart = async (req, res) => {
  const guestSessionId = req.headers['x-guest-session-id'];
  const cart = await cartService.mergeGuestCart(req.user.sub, guestSessionId);
  return success(res, { data: cart, message: 'Cart synced' });
};
