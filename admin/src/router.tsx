import { createBrowserRouter, Navigate } from 'react-router'
import { RootLayout } from './routes/root'
import { Dashboard } from './routes/dashboard'
import { LoginPage } from './routes/login'
import { CitiesPage } from './routes/cities'
import { SettingsPage } from './routes/settings'
import { BannersPage } from './routes/banners'
import { CategoriesPage } from './routes/categories'
import { ProductsPage } from './routes/products'
import { ProductFormPage } from './routes/productForm'
import { AttributesPage } from './routes/attributes'
import { AddOnsPage } from './routes/addons'
import { OrdersPage } from './routes/orders'
import { UsersPage } from './routes/users'
import { ReviewsPage } from './routes/reviews'
import { SectionsPage } from './routes/sections'
import { CouponsPage } from './routes/coupons'
import { TestimonialsPage } from './routes/testimonials'
import { EnquiriesPage } from './routes/enquiries'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'categories', element: <CategoriesPage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'products/new', element: <ProductFormPage /> },
      { path: 'products/:id', element: <ProductFormPage /> },
      { path: 'sections', element: <SectionsPage /> },
      { path: 'coupons', element: <CouponsPage /> },
      { path: 'testimonials', element: <TestimonialsPage /> },
      { path: 'attributes', element: <AttributesPage /> },
      { path: 'addons', element: <AddOnsPage /> },
      { path: 'cities', element: <CitiesPage /> },
      { path: 'pincodes', element: <Navigate to="/cities" replace /> },
      { path: 'banners', element: <BannersPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'reviews', element: <ReviewsPage /> },
      { path: 'enquiries', element: <EnquiriesPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])
