import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const nextConfig: NextConfig = {
  agentRules: false,
  allowedDevOrigins: ["127.0.2.2", "127.0.0.1", "localhost"],
};

export default withBotId(nextConfig);
