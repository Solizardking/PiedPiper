# Solana Integration

PiedPiper now uses a shared browser integration in `shared/solana-integration.js` and `shared/solana-integration.css`.

## Scope

- `index.html`: live Solana RPC status, wallet connection, and a hub catalog proof.
- `richard-hendricks/index.html`: compression result proofs for Huffman, Arithmetic, BWT/RLE, JPEG, K-means, PBIC, and overview state.
- `son-of-anton/index.html`: encryption result proofs for AES, DES, RSA, CA-Password, SHA-512, PP_SSH, and overview state.
- `silicon-valley/index.html`: multi-agent simulation state proofs.
- `GameOfLife/index.html`: Conway cellular automaton state proofs.
- `ForestFire_Simulation/index.html`: forest fire cellular automaton state proofs.
- `encrypted-chat/index.html`: wallet-signed encrypted chat messages written as Solana Memo ciphertext envelopes.

## Chain Behavior

- Default cluster: `devnet`.
- Supported clusters: `devnet`, `mainnet-beta`, `testnet`, and `localnet`.
- Proof transactions use the Solana Memo program:
  `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`.
- The wallet is the only signer. No private key material is handled by the app.
- Proof payloads are hashed in the browser with SHA-256. The Memo instruction stores only compact metadata and the hash.
- Encrypted chat payloads use the same Memo program as a transport layer. Room messages are encrypted in the browser with AES-128-GCM using a PBKDF2-SHA-256 key derived from the room name and shared secret.

## Security Notes

- Compression proofs hash the active tool inputs and outputs.
- Encryption proofs intentionally avoid collecting password and key values. They record value lengths plus current output text into the local hash payload.
- Chat room secrets never leave the browser. The chain receives only wallet-signed ciphertext envelopes, sender public keys, timestamps, salts, IVs, and room hashes.
- Memo transport is public, fee-paid, and size-limited. Keep devnet selected for demos and avoid sending sensitive metadata in room names or aliases.
- The app does not submit SOL transfers, SPL token transfers, account initialization, or custom program instructions.
- Mainnet proof writes cost real SOL fees. Keep `devnet` selected for demos.

## Native Module Bridge

- `PP_HASH`: builds `hashF` and `caHash` with `make -C PP_HASH`; the web encryption page exposes SHA-512 and CA-SHA demo proofs.
- `PP_SSH`: builds `client` and `server` with `make -C PP_SSH`; the web encryption page records PP_SSH command-encryption demo state without exposing live shell access.
- `PCA`: remains an analysis-paper artifact (`PCA/README.pdf`) linked by the compression/model lineage rather than an executable Solana module.
- `training/nvidia`: documents the model/training lineage that descends from CA-PRG, PP_SSH, and Solana wallet-bearing agent models.

## Verification

Local static checks should pass without a build server:

```bash
node --check shared/solana-integration.js
node --check encrypted-chat/chat.js
node --check GameOfLife/game_of_life.js
node --check ForestFire_Simulation/game_of_life.js
make -C PP_HASH test
make -C PP_SSH
```

## Runtime Requirements

The pages are static HTML and load:

- `@solana/web3.js` from unpkg for Memo transaction construction.
- p5.js from CDN for the cellular automaton simulators.
- A browser Solana wallet provider such as Phantom, Solflare, or another wallet exposing `window.solana`.

No build step is required.
