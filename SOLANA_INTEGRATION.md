# Solana Integration

PiedPiper now uses a shared browser integration in `shared/solana-integration.js` and `shared/solana-integration.css`.

## Scope

- `index.html`: live Solana RPC status, wallet connection, and a hub catalog proof.
- `richard-hendricks/index.html`: compression result proofs for Huffman, Arithmetic, BWT/RLE, JPEG, K-means, PBIC, and overview state.
- `son-of-anton/index.html`: encryption result proofs for AES, DES, RSA, CA-Password, SHA-512, PP_SSH, and overview state.
- `silicon-valley/index.html`: multi-agent simulation state proofs.
- `GameOfLife/index.html`: Conway cellular automaton state proofs.
- `ForestFire_Simulation/index.html`: forest fire cellular automaton state proofs.

## Chain Behavior

- Default cluster: `devnet`.
- Supported clusters: `devnet`, `mainnet-beta`, `testnet`, and `localnet`.
- Proof transactions use the Solana Memo program:
  `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`.
- The wallet is the only signer. No private key material is handled by the app.
- Proof payloads are hashed in the browser with SHA-256. The Memo instruction stores only compact metadata and the hash.

## Security Notes

- Compression proofs hash the active tool inputs and outputs.
- Encryption proofs intentionally avoid collecting password and key values. They record value lengths plus current output text into the local hash payload.
- The app does not submit SOL transfers, SPL token transfers, account initialization, or custom program instructions.
- Mainnet proof writes cost real SOL fees. Keep `devnet` selected for demos.

## Runtime Requirements

The pages are static HTML and load:

- `@solana/web3.js` from unpkg for Memo transaction construction.
- p5.js from CDN for the cellular automaton simulators.
- A browser Solana wallet provider such as Phantom, Solflare, or another wallet exposing `window.solana`.

No build step is required.
