import { prisma } from '../config/db.js';
import { ERROR_CODES } from '../config/constants.js';
import * as settings from '../config/settings.service.js';
import { toIST } from '../utils/datetime.js';

function apiError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

const round2 = (n) => Math.round(n * 100) / 100;

// Everything that came from a customer or the admin is escaped before it goes
// into the page — names, addresses and product titles are free text.
const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const inr = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function underHundred(n) {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`;
}

// Indian numbering (lakh / crore), as printed on invoices.
function amountInWords(amount) {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  const chunks = [
    [Math.floor(rupees / 10000000), 'Crore'],
    [Math.floor((rupees % 10000000) / 100000), 'Lakh'],
    [Math.floor((rupees % 100000) / 1000), 'Thousand'],
    [Math.floor((rupees % 1000) / 100), 'Hundred'],
  ];
  const words = chunks.filter(([n]) => n > 0).map(([n, label]) => `${underHundred(n)} ${label}`);
  if (rupees % 100 > 0) words.push(underHundred(rupees % 100));

  const rupeeText = words.length ? words.join(' ') : 'Zero';
  return `Rupees ${rupeeText}${paise > 0 ? ` and ${underHundred(paise)} Paise` : ''} Only`;
}

// Splits the order's tax across its lines. The order stores the tax amount but
// not the rate it was charged at, so the rate is worked back from it; the last
// line absorbs any paisa of rounding so the lines always add up to the order.
function allocateTax(order) {
  const subtotal = Number(order.subtotal);
  const taxAmount = Number(order.taxAmount);
  const rate = subtotal > 0 ? round2((taxAmount / subtotal) * 100) : 0;

  let remaining = taxAmount;
  const lines = order.items.map((item, index) => {
    const taxable = Number(item.subtotal);
    const tax = index === order.items.length - 1 ? round2(remaining) : Math.min(round2((taxable * rate) / 100), remaining);
    remaining = round2(remaining - tax);
    return { item, taxable, tax, total: round2(taxable + tax) };
  });

  return { rate, lines, taxAmount };
}

const sameState = (a, b) => {
  const norm = (v) => String(v ?? '').trim().toLowerCase();
  return norm(a) !== '' && norm(a) === norm(b);
};

function renderInvoiceHtml({ order, seller, tax, paidPayment }) {
  const address = order.addressSnapshot || {};
  const hasGstin = Boolean(seller.gstin);
  const title = hasGstin ? 'Tax Invoice' : 'Invoice';
  const isPaid = Number(order.amountPaid) > 0;

  const issuedAt = toIST(paidPayment?.createdAt || order.createdAt).format('DD MMM YYYY');

  // CGST + SGST when the parcel stays within the seller's state, IGST when it crosses states.
  let taxRows = '';
  if (tax.taxAmount > 0) {
    const label = hasGstin ? 'GST' : 'Tax';
    if (hasGstin && sameState(seller.state, address.state)) {
      const half = round2(tax.taxAmount / 2);
      const halfRate = tax.rate / 2;
      taxRows = `
        <tr><td>CGST (${halfRate}%)</td><td class="num">${inr(half)}</td></tr>
        <tr><td>SGST (${halfRate}%)</td><td class="num">${inr(round2(tax.taxAmount - half))}</td></tr>`;
    } else if (hasGstin) {
      taxRows = `<tr><td>IGST (${tax.rate}%)</td><td class="num">${inr(tax.taxAmount)}</td></tr>`;
    } else {
      taxRows = `<tr><td>${label} (${tax.rate}%)</td><td class="num">${inr(tax.taxAmount)}</td></tr>`;
    }
  }

  const itemRows = tax.lines
    .map(
      ({ item, taxable, tax: lineTax, total }, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(item.productSnapshot?.title || 'Product')}</td>
          <td class="num">${item.qty}</td>
          <td class="num">${inr(item.unitPrice)}</td>
          <td class="num">${inr(taxable)}</td>
          <td class="num">${tax.rate > 0 ? `${inr(lineTax)} <span class="muted">(${tax.rate}%)</span>` : '—'}</td>
          <td class="num strong">${inr(total)}</td>
        </tr>`
    )
    .join('');

  const sellerLines = [seller.address, [seller.city, seller.state, seller.pincode].filter(Boolean).join(', ')]
    .filter(Boolean)
    .map(escapeHtml)
    .join('<br />');

  const buyerLines = [
    address.line1,
    [address.line2, address.landmark].filter(Boolean).join(', '),
    [address.city, address.state].filter(Boolean).join(', ') + (address.pincode ? ` — ${address.pincode}` : ''),
  ]
    .filter((line) => line && line.trim())
    .map(escapeHtml)
    .join('<br />');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)} ${escapeHtml(order.orderNumber)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #f3f5f8; color: #0b1620; font: 14px/1.5 -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }
  .toolbar { max-width: 800px; margin: 16px auto 0; text-align: right; }
  .toolbar button { background: #0e2a4d; color: #fff; border: 0; padding: 10px 20px; border-radius: 999px; font-size: 14px; font-weight: 600; cursor: pointer; }
  .sheet { max-width: 800px; margin: 12px auto 32px; background: #fff; padding: 36px 40px; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  .head { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #0e2a4d; padding-bottom: 16px; }
  h1 { margin: 0; font-size: 26px; letter-spacing: .04em; text-transform: uppercase; color: #0e2a4d; }
  .brand { font-size: 18px; font-weight: 700; color: #0e2a4d; }
  .muted { color: #6b7a88; }
  .strong { font-weight: 700; }
  .meta { text-align: right; font-size: 13px; }
  .meta div { margin-bottom: 2px; }
  .parties { display: flex; gap: 24px; margin-top: 20px; }
  .party { flex: 1; }
  .party h3 { margin: 0 0 4px; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #6b7a88; }
  table { width: 100%; border-collapse: collapse; }
  .items { margin-top: 24px; font-size: 13px; }
  .items th { background: #0e2a4d; color: #fff; text-align: left; padding: 8px 10px; font-weight: 600; }
  .items td { padding: 9px 10px; border-bottom: 1px solid #e5eaf0; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; }
  .items th.num { text-align: right; }
  .totals { margin: 16px 0 0 auto; width: 320px; font-size: 14px; }
  .totals td { padding: 5px 0; }
  .totals tr.grand td { border-top: 2px solid #0e2a4d; padding-top: 9px; font-size: 16px; font-weight: 700; }
  .words { margin-top: 16px; font-size: 13px; }
  .status { display: inline-block; margin-top: 12px; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
  .paid { background: #e6f4ea; color: #15803d; }
  .unpaid { background: #fff4e8; color: #c4600e; }
  .foot { margin-top: 28px; padding-top: 14px; border-top: 1px solid #e5eaf0; font-size: 12px; color: #6b7a88; }
  @media print {
    body { background: #fff; }
    .toolbar { display: none; }
    .sheet { box-shadow: none; margin: 0; padding: 0; max-width: none; }
    @page { margin: 14mm; }
  }
</style>
</head>
<body>
  <div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div>
  <div class="sheet">
    <div class="head">
      <div>
        <div class="brand">${escapeHtml(seller.name)}</div>
        <div class="muted" style="margin-top:4px">${sellerLines}</div>
        ${seller.phone ? `<div class="muted">Phone: ${escapeHtml(seller.phone)}</div>` : ''}
        ${hasGstin ? `<div style="margin-top:4px"><strong>GSTIN:</strong> ${escapeHtml(seller.gstin)}</div>` : ''}
      </div>
      <div class="meta">
        <h1>${escapeHtml(title)}</h1>
        <div><strong>Invoice no:</strong> ${escapeHtml(order.orderNumber)}</div>
        <div><strong>Date:</strong> ${escapeHtml(issuedAt)}</div>
        <div class="status ${isPaid ? 'paid' : 'unpaid'}">${isPaid ? 'Paid' : 'Payment pending'}</div>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <h3>Billed to</h3>
        <div class="strong">${escapeHtml(address.fullName || order.user?.name || 'Customer')}</div>
        <div>${buyerLines}</div>
        ${address.phone ? `<div class="muted">Phone: ${escapeHtml(address.phone)}</div>` : ''}
        ${order.user?.email ? `<div class="muted">${escapeHtml(order.user.email)}</div>` : ''}
      </div>
      <div class="party">
        <h3>Shipped to</h3>
        <div class="strong">${escapeHtml(address.fullName || 'Customer')}</div>
        <div>${buyerLines}</div>
      </div>
    </div>

    <table class="items">
      <thead>
        <tr>
          <th style="width:32px">#</th>
          <th>Item</th>
          <th class="num">Qty</th>
          <th class="num">Rate</th>
          <th class="num">Taxable value</th>
          <th class="num">Tax</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <table class="totals">
      <tr><td>Subtotal (before tax)</td><td class="num">${inr(order.subtotal)}</td></tr>
      ${taxRows}
      ${Number(order.shippingCharge) > 0 ? `<tr><td>Shipping</td><td class="num">${inr(order.shippingCharge)}</td></tr>` : ''}
      ${Number(order.discount) > 0 ? `<tr><td>Discount</td><td class="num">− ${inr(order.discount)}</td></tr>` : ''}
      <tr class="grand"><td>Total</td><td class="num">${inr(order.total)}</td></tr>
      ${isPaid ? `<tr><td class="muted">Amount paid</td><td class="num muted">${inr(order.amountPaid)}</td></tr>` : ''}
    </table>

    <div class="words"><strong>Amount in words:</strong> ${escapeHtml(amountInWords(Number(order.total)))}</div>
    ${
      paidPayment
        ? `<div class="words muted">Paid online${paidPayment.method ? ` via ${escapeHtml(paidPayment.method)}` : ''}${
            paidPayment.razorpayPaymentId ? ` · Payment ID ${escapeHtml(paidPayment.razorpayPaymentId)}` : ''
          }</div>`
        : ''
    }

    <div class="foot">
      This is a computer-generated invoice and does not require a signature.
      ${hasGstin ? '' : '<br />Taxes shown are as charged on the order.'}
    </div>
  </div>
</body>
</html>`;
}

// Loads one Shop With Us order and renders its invoice. `userId` is passed for
// the customer's own download (so they can only ever open their own order);
// the admin passes nothing and can open any order.
export async function buildShopInvoice(orderId, { userId } = {}) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, kind: 'SHOP', ...(userId ? { userId } : {}) },
    include: {
      items: true,
      payments: { where: { status: 'PAID' }, orderBy: { createdAt: 'asc' } },
      user: { select: { name: true, email: true } },
    },
  });
  if (!order) throw apiError(404, ERROR_CODES.NOT_FOUND, 'Order not found');

  // A customer is only invoiced for an order they actually paid for.
  if (userId && Number(order.amountPaid) <= 0) {
    throw apiError(409, ERROR_CODES.CONFLICT, 'An invoice is available once the order has been paid');
  }

  const cfg = settings.getGroup('SHIPPING');
  const seller = {
    name: cfg.businessName || 'Humsafar Events',
    gstin: (cfg.gstin || '').trim(),
    address: cfg.warehouseAddress,
    city: cfg.warehouseCity,
    state: cfg.warehouseState,
    pincode: cfg.warehousePincode,
    phone: cfg.warehousePhone,
  };

  return {
    fileName: `Invoice-${order.orderNumber}`,
    html: renderInvoiceHtml({ order, seller, tax: allocateTax(order), paidPayment: order.payments[0] }),
  };
}
