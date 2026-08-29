// Lets the homepage hero banner tell SiteLoader "my data is ready" — the
// splash waits for both `window.load` AND this signal before fading out, so
// it never disappears a beat before the banner content is actually painted.
const EVENT_NAME = "humsafar:banner-ready";

export function signalBannerReady() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT_NAME));
}

export function onBannerReady(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT_NAME, callback);
  return () => window.removeEventListener(EVENT_NAME, callback);
}
