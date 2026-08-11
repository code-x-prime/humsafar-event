import { z } from 'zod';

export const createEnquirySchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  email: z.string().email().optional(),
  eventType: z.string().optional(),
  eventDate: z.coerce.date().optional(),
  city: z.string().optional(),
  message: z.string().optional(),
  source: z.enum(['CONTACT', 'POPUP', 'PRODUCT', 'WAITLIST', 'URGENT_BOOKING']).optional(),
  status: z.enum(['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED']).optional(),
  adminNote: z.string().optional(),
});

export const updateEnquirySchema = createEnquirySchema.partial();

// Public contact form — deliberately excludes status/adminNote, which are
// admin-only fields the public endpoint should never let a visitor set.
export const createPublicEnquirySchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  email: z.string().email().optional(),
  eventType: z.string().optional(),
  eventDate: z.coerce.date().optional(),
  city: z.string().optional(),
  message: z.string().optional(),
  source: z.enum(['CONTACT', 'POPUP', 'PRODUCT', 'WAITLIST', 'URGENT_BOOKING']).optional(),
});

export const listEnquiriesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  status: z.enum(['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED']).optional(),
  source: z.enum(['CONTACT', 'POPUP', 'PRODUCT', 'WAITLIST', 'URGENT_BOOKING']).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
