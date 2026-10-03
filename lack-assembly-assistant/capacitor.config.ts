import type { CapacitorConfig } from "@capacitor/cli";

// Native iOS/Android shell around the "app" build. See docs/mobile.md.
const config: CapacitorConfig = {
  appId: "com.brownpandas.assembly",
  appName: "Assembly Assistant",
  webDir: "dist-app",
  backgroundColor: "#f3f5f3",
  ios: { contentInset: "never" },
  android: { allowMixedContent: false },
};

export default config;
