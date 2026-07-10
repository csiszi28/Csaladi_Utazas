import path from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import withSerwistInit from "@serwist/next";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaPlugin } = require("@prisma/nextjs-monorepo-workaround-plugin");
import type { NextConfig } from "next";

const monorepoRoot = path.join(process.cwd(), "../..");

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() || randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
  register: false,
});

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "@csaladi-utazas/database"],
  transpilePackages: ["@csaladi-utazas/shared"],
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    "/**/*": [
      "packages/database/src/generated/prisma/**/*",
      "apps/web/src/generated/prisma/**/*",
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = [...config.plugins, new PrismaPlugin()];
    }
    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default withSerwist(nextConfig);
