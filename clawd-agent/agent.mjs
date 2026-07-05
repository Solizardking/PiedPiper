#!/usr/bin/env node
/**
 * Clawd terminal wallet agent 🦞
 *
 * Natural-language chat about your Solana wallet with realtime Helius DAS
 * stats and price-aware, confirmation-gated SPL token burns.
 *
 * LLM auto-routing (first match wins):
 *   1. OPENROUTER_API_KEY  → https://openrouter.ai/api/v1   (model: OPENROUTER_MODEL)
 *   2. GITLAWB             → https://opengateway.gitlawb.com/v1 (model: GITLAWB_MODEL, default mimo-v2.5-pro)
 *
 * Wallet / data:
 *   HELIUS_API_KEY   Helius key — powers DAS stats + prices and the default RPC
 *   RPC_URL          override RPC endpoint (defaults to Helius mainnet, else public mainnet)
 *   WALLET_KEYPAIR   path to a JSON keypair (default ~/.config/solana/id.json)
 *   WALLET_ADDRESS   read-only address when no keypair is available
 *
 * Burn policy ("reasonable rate per token price"):
 *   BURN_MAX_USD        max USD value burned per transaction   (default 5)
 *   BURN_COOLDOWN_SEC   min seconds between burns              (default 60)
 *   Burns ALWAYS require typing the word BURN at the prompt. No exceptions.
 */

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import {
  Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress, createBurnCheckedInstruction, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

const __dir = dirname(fileURLToPath(import.meta.url));

/* ── .env loader (no deps; existing env wins) ─────────────────────────── */
for (const envPath of [join(__dir, ".env"), join(process.cwd(), ".env")]) {
  if (!existsSync(envPath)) continue;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const val = m[2].replace(/^["']|["']$/g, "");
    if (val && !(m[1] in process.env)) process.env[m[1]] = val;
  }
}

/* ── config ───────────────────────────────────────────────────────────── */
const cfg = {
  openrouterKey: process.env.OPENROUTER_API_KEY || "",
  openrouterModel: process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4.5",
  gitlawbKey: process.env.GITLAWB || process.env.GITLAWB_API_KEY || "",
  gitlawbModel: process.env.GITLAWB_MODEL || "mimo-v2.5-pro",
  heliusKey: process.env.HELIUS_API_KEY || "",
  rpcUrl: process.env.RPC_URL
    || (process.env.HELIUS_API_KEY
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : "https://api.mainnet-beta.solana.com"),
  keypairPath: process.env.WALLET_KEYPAIR || join(homedir(), ".config/solana/id.json"),
  walletAddress: process.env.WALLET_ADDRESS || "",
  burnMaxUsd: Number(process.env.BURN_MAX_USD || 5),
  burnCooldownSec: Number(process.env.BURN_COOLDOWN_SEC || 60),
};

const route = cfg.openrouterKey
  ? { name: "OpenRouter", base: "https://openrouter.ai/api/v1", key: cfg.openrouterKey, model: cfg.openrouterModel }
  : cfg.gitlawbKey
    ? { name: "gitlawb OpenGateway", base: "https://opengateway.gitlawb.com/v1", key: cfg.gitlawbKey, model: cfg.gitlawbModel }
    : null;

/* ── wallet ───────────────────────────────────────────────────────────── */
let keypair = null;
try {
  if (existsSync(cfg.keypairPath)) {
    keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(cfg.keypairPath, "utf8"))));
  }
} catch (err) {
  console.error(`⚠ could not load keypair at ${cfg.keypairPath}: ${err.message}`);
}
const walletPubkey = keypair ? keypair.publicKey : (cfg.walletAddress ? new PublicKey(cfg.walletAddress) : null);
const connection = new Connection(cfg.rpcUrl, "confirmed");

/* ── colors ───────────────────────────────────────────────────────────── */
const c = {
  teal: (s) => `\x1b[38;2;20;241;149m${s}\x1b[0m`,
  purple: (s) => `\x1b[38;2;153;69;255m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
};
const mask = (k) => (k ? `${k.slice(0, 9)}…${k.slice(-4)}` : "(unset)");

/* ── Helius DAS tools ─────────────────────────────────────────────────── */
async function dasSearchAssets(owner) {
  if (!cfg.heliusKey) throw new Error("HELIUS_API_KEY not set — DAS stats unavailable");
  const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${cfg.heliusKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: "clawd-das", method: "searchAssets",
      params: {
        ownerAddress: owner, tokenType: "all", page: 1, limit: 1000,
        displayOptions: { showNativeBalance: true, showZeroBalance: false },
      },
    }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`DAS: ${json.error.message || JSON.stringify(json.error)}`);
  return json.result;
}

async function getStats() {
  if (!walletPubkey) throw new Error("no wallet configured (WALLET_KEYPAIR or WALLET_ADDRESS)");
  const owner = walletPubkey.toBase58();
  if (!cfg.heliusKey) {
    const lamports = await connection.getBalance(walletPubkey);
    return { owner, sol: lamports / 1e9, note: "set HELIUS_API_KEY for full DAS token stats + prices", tokens: [] };
  }
  const result = await dasSearchAssets(owner);
  const tokens = [];
  let nfts = 0;
  for (const it of result.items || []) {
    if (it.interface === "FungibleToken" || it.interface === "FungibleAsset") {
      const info = it.token_info || {};
      const bal = (info.balance || 0) / 10 ** (info.decimals || 0);
      const price = info.price_info?.price_per_token ?? null;
      tokens.push({
        symbol: info.symbol || it.content?.metadata?.symbol || "?",
        mint: it.id,
        balance: bal,
        decimals: info.decimals || 0,
        priceUsd: price,
        valueUsd: info.price_info?.total_price ?? (price ? price * bal : null),
      });
    } else nfts++;
  }
  tokens.sort((a, b) => (b.valueUsd || 0) - (a.valueUsd || 0));
  const sol = result.nativeBalance ? result.nativeBalance.lamports / 1e9 : null;
  const solUsd = result.nativeBalance?.total_price ?? 0;
  const totalUsd = tokens.reduce((s, t) => s + (t.valueUsd || 0), 0) + solUsd;
  return { owner, sol, solUsd, totalUsd, nfts, tokens };
}

async function getPrice(mint) {
  if (!cfg.heliusKey) throw new Error("HELIUS_API_KEY not set — price lookup unavailable");
  const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${cfg.heliusKey}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: "clawd-price", method: "getAsset", params: { id: mint } }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`DAS: ${json.error.message}`);
  const info = json.result?.token_info || {};
  return {
    mint,
    symbol: info.symbol || json.result?.content?.metadata?.symbol || "?",
    decimals: info.decimals ?? null,
    priceUsd: info.price_info?.price_per_token ?? null,
    tokenProgram: info.token_program || null,
  };
}

/* ── burn engine (price-capped + confirmation-gated) ──────────────────── */
let lastBurnAt = 0;

function planBurn(price, { usd, amount }) {
  const cap = cfg.burnMaxUsd;
  if (amount) {
    const value = price.priceUsd ? amount * price.priceUsd : null;
    return { amount, valueUsd: value, capped: value !== null && value > cap, capUsd: cap };
  }
  const targetUsd = Math.min(usd || cap, cap);
  if (!price.priceUsd) return { error: "no price available for this mint — pass an explicit amount and it must be under the USD cap" };
  return { amount: targetUsd / price.priceUsd, valueUsd: targetUsd, capped: (usd || cap) > cap, capUsd: cap };
}

async function executeBurn(rl, mint, amount) {
  if (!keypair) throw new Error("burns need a signing keypair — set WALLET_KEYPAIR");
  const now = Date.now() / 1000;
  const wait = cfg.burnCooldownSec - (now - lastBurnAt);
  if (wait > 0) throw new Error(`burn cooldown: wait ${Math.ceil(wait)}s (BURN_COOLDOWN_SEC=${cfg.burnCooldownSec})`);

  const price = await getPrice(mint);
  if (price.decimals === null) throw new Error("could not resolve mint decimals via DAS");
  const valueUsd = price.priceUsd ? amount * price.priceUsd : null;
  if (valueUsd !== null && valueUsd > cfg.burnMaxUsd) {
    throw new Error(`refusing: ${amount} ${price.symbol} ≈ $${valueUsd.toFixed(2)} exceeds BURN_MAX_USD=$${cfg.burnMaxUsd}. ` +
      `Max at current price: ${(cfg.burnMaxUsd / price.priceUsd).toFixed(price.decimals)} ${price.symbol}`);
  }
  if (valueUsd === null && process.env.BURN_ALLOW_UNPRICED !== "1") {
    throw new Error("refusing: mint has no DAS price, so the USD cap can't be enforced (set BURN_ALLOW_UNPRICED=1 to override)");
  }

  const programId = price.tokenProgram === TOKEN_2022_PROGRAM_ID.toBase58() ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  const mintPk = new PublicKey(mint);
  const ata = await getAssociatedTokenAddress(mintPk, keypair.publicKey, false, programId);
  const raw = BigInt(Math.round(amount * 10 ** price.decimals));

  console.log(`\n${c.red("🔥 BURN PLAN")}`);
  console.log(`   token   ${c.bold(price.symbol)}  ${c.dim(mint)}`);
  console.log(`   amount  ${amount}  (${raw} raw @ ${price.decimals} decimals)`);
  console.log(`   value   ${valueUsd === null ? "unpriced" : `$${valueUsd.toFixed(4)}`}  ${c.dim(`(cap $${cfg.burnMaxUsd}/tx, cooldown ${cfg.burnCooldownSec}s)`)}`);
  console.log(`   from    ${ata.toBase58()}`);
  console.log(`   wallet  ${keypair.publicKey.toBase58()}\n`);
  const answer = await rl.question(c.yellow('   type "BURN" to sign and send, anything else aborts: '));
  if (answer.trim() !== "BURN") return { aborted: true };

  const tx = new Transaction().add(
    createBurnCheckedInstruction(ata, mintPk, keypair.publicKey, raw, price.decimals, [], programId),
  );
  const sig = await sendAndConfirmTransaction(connection, tx, [keypair]);
  lastBurnAt = Date.now() / 1000;
  return { signature: sig, explorer: `https://explorer.solana.com/tx/${sig}`, burned: amount, symbol: price.symbol, valueUsd };
}

/* ── LLM chat with a JSON tool protocol (works on any OpenAI-compatible model) ── */
const SYSTEM_PROMPT = `You are Clawd 🦞, PiedPiper's Solana wallet agent, running in a terminal.
You help the user inspect their wallet and burn SPL tokens at a reasonable, price-capped rate.

Wallet: ${walletPubkey ? walletPubkey.toBase58() : "none configured"} (${keypair ? "signing enabled" : "read-only"})
Burn policy: max $${cfg.burnMaxUsd} per burn, ${cfg.burnCooldownSec}s cooldown, and the human must type BURN to confirm — you cannot bypass this.

When you need live data or an action, reply with ONLY a single-line JSON object, nothing else:
  {"tool":"get_stats"}                                    — realtime Helius DAS portfolio (SOL, tokens, prices, USD values)
  {"tool":"get_price","args":{"mint":"<mint>"}}           — price + decimals for one mint
  {"tool":"plan_burn","args":{"mint":"<mint>","usd":2}}   — compute a burn amount from a USD target (capped)
  {"tool":"plan_burn","args":{"mint":"<mint>","amount":123}} — check an explicit amount against the cap
  {"tool":"burn","args":{"mint":"<mint>","amount":123}}   — request the burn (human confirms in terminal)
You will receive the tool result and can then answer in plain language, or chain another tool.
Never invent balances, prices, or signatures — always fetch them. Be concise; this is a terminal.
If the user asks to burn more than the cap allows, explain the cap and offer the max allowed amount instead.`;

async function llm(messages) {
  if (!route) throw new Error("no LLM route — set OPENROUTER_API_KEY (+OPENROUTER_MODEL) or GITLAWB (+GITLAWB_MODEL)");
  const res = await fetch(`${route.base}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${route.key}`, "content-type": "application/json" },
    body: JSON.stringify({ model: route.model, messages, temperature: 0.4 }),
  });
  if (!res.ok) throw new Error(`${route.name} HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${route.name} returned no content: ${JSON.stringify(json).slice(0, 300)}`);
  return content.trim();
}

function parseToolCall(text) {
  const line = text.replace(/^```(?:json)?|```$/gm, "").trim();
  const m = line.match(/^\{[\s\S]*\}$/);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[0]);
    return obj.tool ? obj : null;
  } catch { return null; }
}

async function runTool(rl, call) {
  const args = call.args || {};
  switch (call.tool) {
    case "get_stats": return await getStats();
    case "get_price": return await getPrice(args.mint);
    case "plan_burn": return planBurn(await getPrice(args.mint), args);
    case "burn": return await executeBurn(rl, args.mint, Number(args.amount));
    default: return { error: `unknown tool ${call.tool}` };
  }
}

/* ── rendering helpers ────────────────────────────────────────────────── */
const fmt = (n, dp = 4) => (n === null || n === undefined ? "—" : Number(n).toLocaleString("en-US", { maximumFractionDigits: dp }));

function printStats(s) {
  console.log(`\n${c.teal("◎ " + fmt(s.sol))} SOL${s.solUsd ? c.dim(` ($${fmt(s.solUsd, 2)})`) : ""}  ·  ${c.bold("$" + fmt(s.totalUsd ?? 0, 2))} total  ·  ${s.tokens.length} tokens · ${s.nfts ?? 0} NFTs`);
  for (const t of s.tokens.slice(0, 15)) {
    console.log(`  ${c.purple(t.symbol.padEnd(10))} ${fmt(t.balance).padStart(16)}  ${("$" + fmt(t.priceUsd, 6)).padStart(14)}  ${c.teal(("$" + fmt(t.valueUsd, 2)).padStart(12))}  ${c.dim(t.mint)}`);
  }
  if (s.note) console.log(c.dim(`  ${s.note}`));
  console.log();
}

/* ── main ─────────────────────────────────────────────────────────────── */
function printBanner() {
  console.log(c.purple("\n  ╔═══════════════════════════════════════════════╗"));
  console.log(c.purple("  ║") + c.bold("   🦞 CLAWD WALLET AGENT — PiedPiper edition   ") + c.purple("║"));
  console.log(c.purple("  ╚═══════════════════════════════════════════════╝"));
  console.log(`  llm     ${route ? `${c.teal(route.name)} · ${route.model} · key ${mask(route.key)}` : c.red("none — set OPENROUTER_API_KEY or GITLAWB")}`);
  console.log(`  wallet  ${walletPubkey ? c.teal(walletPubkey.toBase58()) : c.red("none")} ${keypair ? c.dim("(signing)") : c.yellow("(read-only)")}`);
  console.log(`  rpc     ${c.dim(cfg.rpcUrl.replace(/api-key=[^&]+/, "api-key=***"))}`);
  console.log(`  das     ${cfg.heliusKey ? c.teal("Helius key " + mask(cfg.heliusKey)) : c.yellow("HELIUS_API_KEY unset — stats limited")}`);
  console.log(`  burns   ${c.dim(`cap $${cfg.burnMaxUsd}/tx · cooldown ${cfg.burnCooldownSec}s · typed BURN confirmation`)}`);
  console.log(c.dim("  chat in plain english, or: /stats /price <mint> /burn <mint> <amount> /help /exit\n"));
}

async function main() {
  printBanner();
  if (process.argv.includes("--check")) return;

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const messages = [{ role: "system", content: SYSTEM_PROMPT }];

  for (;;) {
    let input;
    try { input = (await rl.question(c.teal("you ▸ "))).trim(); } catch { break; }
    if (!input) continue;
    if (input === "/exit" || input === "/quit") break;

    try {
      if (input === "/help") {
        console.log(c.dim("  /stats — live DAS portfolio · /price <mint> — token price · /burn <mint> <amount> — capped burn · /exit\n  anything else goes to the LLM as natural language\n"));
        continue;
      }
      if (input === "/stats") { printStats(await getStats()); continue; }
      if (input.startsWith("/price ")) { console.log(await getPrice(input.split(/\s+/)[1]), "\n"); continue; }
      if (input.startsWith("/burn ")) {
        const [, mint, amt] = input.split(/\s+/);
        const result = await executeBurn(rl, mint, Number(amt));
        console.log(result.aborted ? c.yellow("  aborted\n") : `  ${c.teal("burned")} ${result.burned} ${result.symbol} → ${result.explorer}\n`);
        continue;
      }

      // Natural language → LLM with tool loop
      messages.push({ role: "user", content: input });
      for (let round = 0; round < 6; round++) {
        const reply = await llm(messages);
        messages.push({ role: "assistant", content: reply });
        const call = parseToolCall(reply);
        if (!call) { console.log(`${c.purple("clawd ▸")} ${reply}\n`); break; }
        console.log(c.dim(`  ⚙ ${call.tool}${call.args ? " " + JSON.stringify(call.args) : ""}`));
        let result;
        try { result = await runTool(rl, call); }
        catch (err) { result = { error: err.message }; }
        if (call.tool === "get_stats" && !result.error) printStats(result);
        messages.push({ role: "user", content: `[tool:${call.tool} result] ${JSON.stringify(result)}` });
        if (round === 5) console.log(c.yellow("  tool round limit reached\n"));
      }
    } catch (err) {
      console.log(c.red(`  ✗ ${err.message}\n`));
    }
  }
  rl.close();
  console.log(c.dim("\n  🦞 clawd out.\n"));
}

main().catch((err) => { console.error(c.red(`fatal: ${err.message}`)); process.exit(1); });
