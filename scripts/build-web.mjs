import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const webDir = path.join(root, "web");
const outputs = ["dist", "docs"];

for (const output of outputs) {
  const target = path.join(root, output);
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await cp(webDir, target, { recursive: true });
}

console.log("Built MoneyLens PWA to dist/ and docs/");
