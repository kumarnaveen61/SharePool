import { clearSessionCookie } from "@/lib/auth/session";
import { ok, withErrorHandling } from "@/lib/api-response";

export const POST = withErrorHandling(async () => {
  await clearSessionCookie();
  return ok({ loggedOut: true });
});
