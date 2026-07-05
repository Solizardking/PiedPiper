# Encryption Solana Integration

The encryption modules are surfaced through `son-of-anton/index.html`.

That page connects these source implementations to a browser Solana proof flow:

- AES-128: `Encryption/AES-128`
- DES: `Encryption/DES Encryption`
- RSA: `Encryption/RSA Encryption`
- CA-Password: `Encryption/CA_Password_Protect`
- SHA-512: `PP_HASH`
- PP_SSH: `PP_SSH`

Each proof hashes the active encryption tab state in the browser and writes the resulting hash to the Solana Memo program after wallet approval. Password and key field values are not collected into the proof payload.
