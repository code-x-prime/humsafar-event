"use client";

import { useEffect, useState } from "react";
import { getJson } from "@/lib/api";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10;

// Loads an order for the "confirmed" pages and keeps checking it for up to
// ~30 seconds while it is still PENDING_PAYMENT. Right after a payment the
// order can briefly still look unpaid (the browser reports back before
// Razorpay's webhook lands, or a UPI payment is still settling), and the page
// must not claim success until the server really says so.
export function useOrderStatus<T extends { status: string }>(path: string) {
  const [order, setOrder] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  // True once there is nothing left to wait for: either the order has a final
  // status, the lookup failed, or we've stopped polling.
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let polls = 0;

    async function load() {
      try {
        const data = await getJson<T>(path);
        if (cancelled) return;
        setOrder(data);

        if (data.status === "PENDING_PAYMENT" && polls < MAX_POLLS) {
          polls += 1;
          timer = setTimeout(load, POLL_INTERVAL_MS);
        } else {
          setSettled(true);
        }
      } catch {
        if (cancelled) return;
        setFailed(true);
        setSettled(true);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [path]);

  return { order, failed, settled };
}
