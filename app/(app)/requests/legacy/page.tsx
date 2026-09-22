import { redirect } from "next/navigation";

export default function LegacyRequests() {
  redirect("/activity?tab=incoming");
}
