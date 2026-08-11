import { useQuery } from '@tanstack/react-query'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'
import { api } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import {
  IconShoppingCart,
  IconCurrencyRupee,
  IconPackage,
  IconUsers,
  IconMessages,
  IconStar,
} from '@tabler/icons-react'

interface Overview {
  orders: { total: number; pending: number; completed: number }
  products: { total: number; active: number }
  users: { total: number }
  enquiries: { new: number }
  reviews: { pending: number }
  revenue: number
}

interface TimeseriesPoint {
  date: string
  orders: number
  revenue: number
}

const chartConfig = {
  revenue: { label: 'Revenue (₹)', color: 'var(--primary)' },
  orders: { label: 'Orders', color: 'var(--chart-2)' },
} satisfies ChartConfig

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  isLoading,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
  isLoading: boolean
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          {isLoading ? (
            <Skeleton className="mt-1 h-6 w-16" />
          ) : (
            <p className="font-display text-xl font-semibold text-foreground">{value}</p>
          )}
          {sub && !isLoading && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

export function Dashboard() {
  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => api.get<Overview>('/admin/dashboard'),
  })
  const { data: seriesData, isLoading: seriesLoading } = useQuery({
    queryKey: ['dashboard', 'timeseries'],
    queryFn: () => api.get<TimeseriesPoint[]>('/admin/dashboard/timeseries?days=14'),
  })

  const overview = overviewData?.data
  const series = seriesData?.data ?? []

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-primary">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">A live snapshot of your store — updated on every visit.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={IconCurrencyRupee}
          label="Revenue (paid orders)"
          value={overview ? `₹${overview.revenue.toLocaleString('en-IN')}` : '—'}
          isLoading={overviewLoading}
        />
        <StatCard
          icon={IconShoppingCart}
          label="Orders"
          value={overview ? String(overview.orders.total) : '—'}
          sub={overview ? `${overview.orders.pending} pending · ${overview.orders.completed} completed` : undefined}
          isLoading={overviewLoading}
        />
        <StatCard
          icon={IconPackage}
          label="Products"
          value={overview ? String(overview.products.total) : '—'}
          sub={overview ? `${overview.products.active} active` : undefined}
          isLoading={overviewLoading}
        />
        <StatCard
          icon={IconUsers}
          label="Customers"
          value={overview ? String(overview.users.total) : '—'}
          isLoading={overviewLoading}
        />
        <StatCard
          icon={IconMessages}
          label="New Enquiries"
          value={overview ? String(overview.enquiries.new) : '—'}
          isLoading={overviewLoading}
        />
        <StatCard
          icon={IconStar}
          label="Reviews Awaiting Approval"
          value={overview ? String(overview.reviews.pending) : '—'}
          isLoading={overviewLoading}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Orders & Revenue</CardTitle>
          <CardDescription>Last 14 days, paid orders only.</CardDescription>
        </CardHeader>
        <CardContent>
          {seriesLoading ? (
            <Skeleton className="aspect-video w-full" />
          ) : (
            <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-orders)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-orders)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                  tickFormatter={(value: string) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => new Date(value as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      indicator="dot"
                    />
                  }
                />
                <Area dataKey="revenue" type="natural" fill="url(#fillRevenue)" stroke="var(--color-revenue)" stackId="a" />
                <Area dataKey="orders" type="natural" fill="url(#fillOrders)" stroke="var(--color-orders)" stackId="b" />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
