import { redirect } from "next/navigation";

export default function MyAccessPage() {
  redirect("/access?tab=using");
}
