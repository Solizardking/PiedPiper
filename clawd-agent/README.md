# 🦞 Clawd Wallet Agent

Natural-language terminal agent for your Solana wallet: chat about holdings, get
realtime Helius DAS stats, and burn SPL tokens at a **price-capped, confirmation-gated**
rate.

## Quick start

```bash
cd clawd-agent
npm install
cp .env.example .env   # fill in keys (or edit the existing .env)
npm start
```

## Talk to it

```
you ▸ what's in my wallet?
you ▸ how much is my BONK worth right now?
you ▸ burn about $2 worth of BONK
you ▸ /stats
you ▸ /burn <mint> <amount>
```

The agent answers in plain language and calls live tools (never invents numbers):

| Tool | What it does |
|------|--------------|
| `get_stats` | Helius DAS `searchAssets` — SOL, every fungible token, prices, USD values, NFT count |
| `get_price` | DAS `getAsset` — price per token + decimals for any mint |
| `plan_burn` | Converts a USD target into a token amount, clamped to the cap |
| `burn` | Builds `burnChecked`, shows the full plan, requires you to type `BURN` |

## LLM auto-routing

1. `OPENROUTER_API_KEY` set → OpenRouter (`OPENROUTER_MODEL`, default `anthropic/claude-sonnet-4.5`)
2. else `GITLAWB` set → gitlawb OpenGateway `https://opengateway.gitlawb.com/v1` (`GITLAWB_MODEL`, default `mimo-v2.5-pro`)

Both are OpenAI-compatible `/chat/completions`; the tool protocol is plain JSON so it
works on any model.

## Burn safety ("reasonable rate per token price")

- **USD cap per transaction** — `BURN_MAX_USD` (default $5). Price is fetched live from
  DAS; if `amount × price` exceeds the cap the burn is refused and the max allowed
  amount is suggested instead.
- **Cooldown** — `BURN_COOLDOWN_SEC` (default 60s) between burns.
- **Unpriced mints refused** unless `BURN_ALLOW_UNPRICED=1`.
- **Typed confirmation** — every burn prints the full plan (token, amount, USD value,
  ATA, wallet) and waits for you to type `BURN`. The LLM cannot bypass this.

## Wallet

Signing uses `WALLET_KEYPAIR` (default `~/.config/solana/id.json`). Without a keypair
the agent runs read-only against `WALLET_ADDRESS`. RPC defaults to Helius mainnet when
`HELIUS_API_KEY` is set, else the public mainnet endpoint (`RPC_URL` overrides).

⚠️ `.env` holds live keys and is gitignored. Never commit it. Rotate any key that has
been pasted into a chat or shared channel.
