import path from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import withSerwistInit from "@serwist/next";
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
  transpilePackages: ["@csaladi-utazas/shared", "@csaladi-utazas/database"],
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    "/**/*": ["packages/database/src/generated/prisma/**/*"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
    },
  },
};

export default withSerwist(nextConfig);
