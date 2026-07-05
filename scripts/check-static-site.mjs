import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const htmlFiles = [
  "index.html",
  "encrypted-chat/index.html",
  "ForestFire_Simulation/index.html",
  "GameOfLife/index.html",
  "richard-hendricks/index.html",
  "silicon-valley/index.html",
  "son-of-anton/index.html",
];

const expected = {
  p5: "https://cdn.jsdelivr.net/npm/p5@2.3.0/lib/p5.min.js",
  solana: "https://unpkg.com/@solana/web3.js@1.98.4/lib/index.iife.min.js",
};

const failures = [];

function stripFragmentAndQuery(url) {
  return url.split("#")[0].split("?")[0];
}

function isExternal(url) {
  return /^(https?:)?\/\//.test(url);
}

function isIgnorable(url) {
  return (
    !url ||
    url.startsWith("#") ||
    url.startsWith("mailto:") ||
    url.startsWith("tel:") ||
    url.startsWith("data:") ||
    url.startsWith("javascript:")
  );
}

function validateLocalReferences(file, html) {
  const attrPattern = /\b(?:src|href)=["']([^"']+)["']/g;
  for (const match of html.matchAll(attrPattern)) {
    const url = match[1];
    if (isIgnorable(url) || isExternal(url)) continue;

    const localPath = stripFragmentAndQuery(url);
    if (!localPath) continue;

    const absolutePath = resolve(root, dirname(file), decodeURIComponent(localPath));
    if (!existsSync(absolutePath)) {
      failures.push(`${file}: missing local reference ${url}`);
    }
  }
}

function validatePinnedScripts(file, html) {
  const externalScriptPattern = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g;
  for (const match of html.matchAll(externalScriptPattern)) {
    const src = match[1];
    if (/\/p5(?:\.min)?\.js/.test(src) && src !== expected.p5) {
      failures.push(`${file}: expected ${expected.p5}, found ${src}`);
    }
    if (src.includes("@solana/web3.js") && src !== expected.solana) {
      failures.push(`${file}: expected ${expected.solana}, found ${src}`);
    }
  }
}

function validatePackageMetadata() {
  const manifest = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  if (manifest.dependencies?.p5 !== "2.3.0") {
    failures.push("package.json: p5 must be pinned to 2.3.0");
  }
  if (manifest.dependencies?.["@solana/web3.js"] !== "1.98.4") {
    failures.push("package.json: @solana/web3.js must be pinned to 1.98.4");
  }

  for (const staleLock of [
    "ForestFire_Simulation/package-lock.json",
    "GameOfLife/package-lock.json",
  ]) {
    if (existsSync(resolve(root, staleLock))) {
      failures.push(`${staleLock}: remove orphaned nested package lock`);
    }
  }
}

for (const file of htmlFiles) {
  const absolutePath = resolve(root, file);
  if (!existsSync(absolutePath)) {
    failures.push(`${file}: file not found`);
    continue;
  }

  const html = readFileSync(absolutePath, "utf8");
  validateLocalReferences(file, html);
  validatePinnedScripts(file, html);
}

validatePackageMetadata();

if (failures.length > 0) {
  console.error("Static site check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Static site check passed for ${htmlFiles.length} HTML files.`);
