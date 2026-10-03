import { ReviewsManager, type ReviewsManagerConfig } from '@/components/ReviewsManager'

const CONFIG: ReviewsManagerConfig = {
  title: 'Reviews',
  description:
    'Reviews on decoration pages — from customers after a completed order, or added by you. Hide a review to take it off the website, delete it for good, or add your own with photos.',
  reviewsPath: '/admin/reviews',
  productsPath: '/admin/products',
  queryKey: 'reviews',
  imageFolder: 'reviews',
}

export function ReviewsPage() {
  return <ReviewsManager config={CONFIG} />
}
