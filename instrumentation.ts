export async function register() {
  // Only run in the Node.js runtime (not the Edge runtime, which this
  // project doesn't use for anything requiring the scheduler anyway).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startSessionExpiryScheduler } = await import("@/lib/scheduler");
    startSessionExpiryScheduler();
  }
}
