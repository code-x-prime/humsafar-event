import { ReviewsManager, type ReviewsManagerConfig } from '@/components/ReviewsManager'

const CONFIG: ReviewsManagerConfig = {
  title: 'Shop Reviews',
  description:
    'Reviews on Shop With Us products — from customers after a delivered order, or added by you. Hide a review to take it off the website, delete it for good, or add your own with photos.',
  reviewsPath: '/admin/shop-reviews',
  productsPath: '/admin/shop-products',
  queryKey: 'shop-reviews',
  imageFolder: 'shop-reviews',
}

export function ShopReviewsPage() {
  return <ReviewsManager config={CONFIG} />
}
