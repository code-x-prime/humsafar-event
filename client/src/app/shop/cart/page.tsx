import { redirect } from "next/navigation";

// Shop With Us items now live in the same cart as decoration bookings —
// this route stays only so old links/bookmarks still land somewhere useful.
export default function ShopCartRedirectPage() {
  redirect("/cart");
}
