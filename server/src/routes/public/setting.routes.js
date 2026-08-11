import { Router } from 'express';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import * as settingsCache from '../../config/settings.service.js';
import { success } from '../../utils/apiResponse.js';

const router = Router();

// Public, non-secret contact info the client needs (currently just the
// WhatsApp support number) — kept separate from /admin/settings so nothing
// secret is ever reachable without auth.
router.get(
  '/contact',
  asyncHandler(async (req, res) => {
    const whatsappNumber = settingsCache.get('whatsappNumber', '919899899150');
    return success(res, { data: { whatsappNumber }, message: 'Contact settings fetched' });
  })
);

export default router;
