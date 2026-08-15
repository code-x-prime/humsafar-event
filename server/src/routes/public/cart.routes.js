import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { optionalAuth, verifyJWT } from '../../middlewares/auth.middleware.js';
import * as cartController from '../../controllers/cart.controller.js';
import { addCartItemSchema, addShopCartItemSchema, updateCartItemSchema } from '../../validators/cart.validator.js';

const router = Router();

// Guest carts (identified by the x-guest-session-id header) and logged-in
// carts (identified by the verified JWT) share these same endpoints —
// optionalAuth attaches req.user when a valid token is present but never
// blocks the request, so a guest hits the exact same routes. One cart holds
// both decoration-booking items (/items) and Shop With Us items
// (/shop-items) — checkout separates them by kind.
router.get('/', optionalAuth, asyncHandler(cartController.getCart));
router.post('/items', optionalAuth, validate(addCartItemSchema), asyncHandler(cartController.addItem));
router.post('/shop-items', optionalAuth, validate(addShopCartItemSchema), asyncHandler(cartController.addShopItem));
router.patch('/items/:itemId', optionalAuth, validate(updateCartItemSchema), asyncHandler(cartController.updateItem));
router.delete('/items/:itemId', optionalAuth, asyncHandler(cartController.removeItem));

// Requires a real login — this is what the client calls immediately after a
// successful OTP verify to fold the guest cart into the user's cart.
router.post('/merge', verifyJWT, asyncHandler(cartController.mergeGuestCart));

export default router;
