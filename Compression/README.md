# Compression Solana Integration

The compression modules are surfaced through `richard-hendricks/index.html`.

That page connects the source algorithms under this directory to a browser Solana proof flow:

- Huffman: `Compression/Huffman`
- Arithmetic: `Compression/Arithmetic`
- BWT/RLE: `Compression/Add-ons`
- Image compression: `Image Compression/JPEG Compression`, `Image Compression/K-means`, and `Image Compression/PBIC`

Each proof hashes the active compression tab state in the browser and writes the resulting hash to the Solana Memo program after wallet approval.
