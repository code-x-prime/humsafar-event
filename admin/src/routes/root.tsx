import { useState } from 'react'
import { Outlet, Link, useLocation, Navigate } from 'react-router'
import { Toaster } from 'sonner'
import { Menu, X } from 'lucide-react'
import {
  IconLayoutDashboard,
  IconCategory,
  IconPackage,
  IconLayoutGrid,
  IconTicket,
  IconAdjustmentsHorizontal,
  IconTag,
  IconMapPin,
  IconPhoto,
  IconShoppingCart,
  IconUsers,
  IconStar,
  IconMessages,
  IconQuote,
  IconSettings,
} from '@tabler/icons-react'
import { useAuth } from '@/context/AuthContext'

const NAV = [
  { to: '/', label: 'Dashboard', icon: IconLayoutDashboard },
  { to: '/categories', label: 'Categories', icon: IconCategory },
  { to: '/products', label: 'Products', icon: IconPackage },
  { to: '/sections', label: 'Home Page', icon: IconLayoutGrid },
  { to: '/coupons', label: 'Coupons', icon: IconTicket },
  { to: '/attributes', label: 'Attributes', icon: IconAdjustmentsHorizontal },
  { to: '/addons', label: 'Add-ons', icon: IconTag },
  { to: '/cities', label: 'Cities & Pincodes', icon: IconMapPin },
  { to: '/banners', label: 'Banners', icon: IconPhoto },
  { to: '/orders', label: 'Orders', icon: IconShoppingCart },
  { to: '/users', label: 'Users', icon: IconUsers },
  { to: '/reviews', label: 'Reviews', icon: IconStar },
  { to: '/enquiries', label: 'Enquiries', icon: IconMessages },
  { to: '/testimonials', label: 'Testimonials', icon: IconQuote },
  { to: '/settings', label: 'Settings', icon: IconSettings },
]

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation()
  return (
    <nav className="flex flex-col gap-1 font-heading text-sm">
      {NAV.map((item) => {
        const isActive = location.pathname === item.to
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors ${
              isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
            }`}
          >
            <item.icon className="h-4 w-4 shrink-0" stroke={1.75} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function RootLayout() {
  const { isAuthenticated, isRestoring, user, logout } = useAuth()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  if (isRestoring) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans">
      <Toaster position="top-right" richColors closeButton />

      {/* Desktop sidebar — its own scroll region, independent of page content */}
      <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-border bg-secondary/40 p-4 md:block">
        <div className="mb-6 font-display text-xl font-semibold text-primary">Humsafar Events</div>
        <SidebarNav />
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-background p-4 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-display text-xl font-semibold text-primary">Humsafar Events</span>
              <button onClick={() => setMobileNavOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileNavOpen(true)} className="text-muted-foreground md:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <span className="hidden font-heading text-sm text-muted-foreground sm:inline">Admin Panel</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline">{user?.email}</span>
            <button onClick={logout} className="text-muted-foreground hover:text-foreground">
              Sign out
            </button>
          </div>
        </header>

        {/* The only element that scrolls for page content — sidebar/header stay put */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
