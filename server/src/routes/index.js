import { Router } from 'express';
import authRoutes from './public/auth.routes.js';
import cityRoutes from './public/city.routes.js';
import pincodeRoutes from './public/pincode.routes.js';
import bannerRoutes from './public/banner.routes.js';
import categoryRoutes from './public/category.routes.js';
import productRoutes from './public/product.routes.js';
import searchRoutes from './public/search.routes.js';
import settingRoutes from './public/setting.routes.js';
import cartRoutes from './public/cart.routes.js';
import addressRoutes from './public/address.routes.js';
import slotAvailabilityRoutes from './public/slotAvailability.routes.js';
import checkoutRoutes from './public/checkout.routes.js';
import customerProfileRoutes from './public/customerProfile.routes.js';
import razorpayWebhookRoutes from './public/razorpayWebhook.routes.js';
import reviewRoutes from './public/review.routes.js';
import testimonialRoutes from './public/testimonial.routes.js';
import enquiryRoutes from './public/enquiry.routes.js';
import adminRoutes from './admin/index.js';

const router = Router();

const publicRoutes = [
  { path: '/auth', route: authRoutes },
  { path: '/cities', route: cityRoutes },
  { path: '/pincodes', route: pincodeRoutes },
  { path: '/banners', route: bannerRoutes },
  { path: '/categories', route: categoryRoutes },
  { path: '/products', route: productRoutes },
  { path: '/search', route: searchRoutes },
  { path: '/settings', route: settingRoutes },
  { path: '/cart', route: cartRoutes },
  { path: '/addresses', route: addressRoutes },
  { path: '/slots', route: slotAvailabilityRoutes },
  { path: '/checkout', route: checkoutRoutes },
  { path: '/profile', route: customerProfileRoutes },
  { path: '/webhooks/razorpay', route: razorpayWebhookRoutes },
  { path: '/reviews', route: reviewRoutes },
  { path: '/testimonials', route: testimonialRoutes },
  { path: '/enquiries', route: enquiryRoutes },
];

publicRoutes.forEach(({ path, route }) => router.use(path, route));

router.use('/admin', adminRoutes);

export default router;
