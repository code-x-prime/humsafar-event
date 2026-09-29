// Default pre-filled message for the site's generic WhatsApp buttons (bottom nav,
// contact page, drawer, about, home CTA). Specified by the Ads team so every
// lead arrives with the same recognisable opening line. Product pages build
// their own message (product title + URL) and intentionally don't use this.
export const WHATSAPP_DEFAULT_MESSAGE =
  "Hi, I’d like to book a decoration for my upcoming event. Please share the details.";

export function whatsappLink(number: string, message: string = WHATSAPP_DEFAULT_MESSAGE): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
