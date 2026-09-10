// Feature flags driven by environment variables. NEXT_PUBLIC_* vars are inlined
// at build time, so these are safe to read from client components.
//
// WHATSAPP_ONLY: while running WhatsApp-lead ads, the site hides all direct
// checkout paths (Book Now, Add to Cart, Buy Now) and the Sign In / login
// entry point, leaving WhatsApp as the only call-to-action.
//
// Default is ON. To bring Book Now / Add to Cart / Login back, set the env var
// NEXT_PUBLIC_WHATSAPP_ONLY=false and redeploy — no code change needed.
export const WHATSAPP_ONLY =
  (process.env.NEXT_PUBLIC_WHATSAPP_ONLY || "true").toLowerCase() !== "false";
