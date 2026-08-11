import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

interface SidebarContextValue {
  collapsed: boolean
  toggle: () => void
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const value = useMemo(
    () => ({ collapsed, toggle: () => setCollapsed((c) => !c), mobileOpen, setMobileOpen }),
    [collapsed, mobileOpen]
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
