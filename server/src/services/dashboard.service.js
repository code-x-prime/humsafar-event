import { prisma } from '../config/db.js';

// Cheap, real aggregate counts pulled straight from Postgres. No caching —
// admin dashboard traffic is low volume so a fresh read each time is fine.
export async function getOverview() {
  const [
    totalOrders,
    pendingOrders,
    completedOrders,
    totalProducts,
    activeProducts,
    totalUsers,
    newEnquiries,
    totalRevenue,
    pendingReviews,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: 'PENDING_PAYMENT' } }),
    prisma.order.count({ where: { status: 'COMPLETED' } }),
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.enquiry.count({ where: { status: 'NEW' } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { in: ['COMPLETED', 'CONFIRMED'] } } }),
    prisma.review.count({ where: { status: 'PENDING' } }),
  ]);

  return {
    orders: { total: totalOrders, pending: pendingOrders, completed: completedOrders },
    products: { total: totalProducts, active: activeProducts },
    users: { total: totalUsers },
    enquiries: { new: newEnquiries },
    reviews: { pending: pendingReviews },
    revenue: Number(totalRevenue._sum.total || 0),
  };
}

// GET /admin/dashboard/timeseries — daily order count + revenue for the last
// N days, for the dashboard area chart. Revenue only counts orders that
// actually got paid (CONFIRMED/COMPLETED), same rule as getOverview's total.
export async function getTimeseries(days = 14) {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: since }, status: { in: ['CONFIRMED', 'COMPLETED'] } },
    select: { createdAt: true, total: true },
  });

  const byDay = new Map();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, { date: key, orders: 0, revenue: 0 });
  }

  for (const order of orders) {
    const key = order.createdAt.toISOString().slice(0, 10);
    const bucket = byDay.get(key);
    if (bucket) {
      bucket.orders += 1;
      bucket.revenue += Number(order.total);
    }
  }

  return [...byDay.values()];
}
