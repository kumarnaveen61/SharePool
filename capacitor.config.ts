import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.kumarnaveen61.sharepool",
  appName: "SharePool",
  webDir: "public",
  server: {
    url: "https://share-pool.vercel.app",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;