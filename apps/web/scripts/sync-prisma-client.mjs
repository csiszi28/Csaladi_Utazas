import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = join(__dirname, "..");
const source = join(webRoot, "../../packages/database/src/generated/prisma");
const target = join(webRoot, "src/generated/prisma");

if (!existsSync(source)) {
  console.error("Prisma client not generated. Run: pnpm --filter @csaladi-utazas/database exec prisma generate");
  process.exit(1);
}

mkdirSync(dirname(target), { recursive: true });
cpSync(source, target, { recursive: true });
console.log("Synced Prisma client to apps/web/src/generated/prisma");
