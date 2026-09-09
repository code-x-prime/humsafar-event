// Feature flags driven by environment variables. NEXT_PUBLIC_* vars are inlined
// at build time, so these are safe to read from client components.
//
// WHATSAPP_ONLY: while running WhatsApp-lead ads, the site hides all direct
// checkout paths (Book Now, Add to Cart, Buy Now) and the Sign In / login
// entry point, leaving WhatsApp as the only call-to-action. Flip the env var
// to "false" (or remove it) and redeploy to bring everything back — no code
// change needed.
export const WHATSAPP_ONLY =
  (process.env.NEXT_PUBLIC_WHATSAPP_ONLY || "").toLowerCase() === "true";
