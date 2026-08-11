let loadPromise: Promise<boolean> | null = null;

// Loads Razorpay's checkout.js exactly once per page session — every
// "Pay Now" click reuses the same promise instead of injecting the script tag
// again, and callers get a clean boolean instead of having to check
// window.Razorpay themselves.
export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve(true);

  if (!loadPromise) {
    loadPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  return loadPromise;
}
