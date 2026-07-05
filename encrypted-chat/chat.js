(function () {
    "use strict";

    const MEMO_PREFIX = "ppchat:v1";
    const MAX_MEMO_BYTES = 900;
    const MAX_SCAN_SIGNATURES = 64;
    const PBKDF2_ITERATIONS = 180000;
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const els = {};
    const state = {
        roomName: "piedpiper-devnet",
        roomHash: "",
        messages: new Map(),
        busy: false,
    };

    function byId(id) {
        return document.getElementById(id);
    }

    function initElements() {
        [
            "roomForm",
            "roomInput",
            "secretInput",
            "aliasInput",
            "loadRoomBtn",
            "syncBtn",
            "roomHash",
            "roomTitle",
            "memoSize",
            "messageList",
            "chatStatus",
            "composerForm",
            "messageInput",
            "charCount",
            "sendBtn",
        ].forEach((id) => {
            els[id] = byId(id);
        });
    }

    function setBusy(busy) {
        state.busy = busy;
        [els.loadRoomBtn, els.syncBtn, els.sendBtn].forEach((button) => {
            if (button) button.disabled = busy;
        });
    }

    function setStatus(message) {
        els.chatStatus.textContent = message;
    }

    function setStatusLink(prefix, signature, explorerUrl) {
        els.chatStatus.textContent = "";
        els.chatStatus.append(document.createTextNode(prefix + " "));
        if (!explorerUrl) {
            els.chatStatus.append(document.createTextNode(shortAddress(signature)));
            return;
        }
        const link = document.createElement("a");
        link.href = explorerUrl;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = shortAddress(signature);
        els.chatStatus.append(link);
    }

    function formatError(error) {
        const message = error && error.message ? error.message : String(error || "Unknown error");
        if (/reject/i.test(message)) return "Wallet rejected the request";
        if (/insufficient/i.test(message)) return "Insufficient SOL for transaction fee";
        if (/blockhash/i.test(message)) return "Blockhash expired; try again";
        return message;
    }

    function currentRoomName() {
        const value = els.roomInput.value.trim();
        return value || "piedpiper-devnet";
    }

    function currentSecret() {
        return els.secretInput.value;
    }

    function currentAlias() {
        return els.aliasInput.value.trim();
    }

    function requireCrypto() {
        if (!window.crypto || !window.crypto.subtle) {
            throw new Error("Web Crypto is unavailable in this browser context");
        }
    }

    function bytesToBase64Url(bytes) {
        let binary = "";
        const chunkSize = 0x8000;
        for (let index = 0; index < bytes.length; index += chunkSize) {
            binary += String.fromCharCode.apply(null, bytes.subarray(index, index + chunkSize));
        }
        return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    }

    function base64UrlToBytes(value) {
        const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
        const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
        const binary = atob(padded);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index++) {
            bytes[index] = binary.charCodeAt(index);
        }
        return bytes;
    }

    async function sha256Hex(value) {
        if (window.PiedPiperSolana && window.PiedPiperSolana.hashText) {
            return window.PiedPiperSolana.hashText(value);
        }
        const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
        return Array.from(new Uint8Array(digest))
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("");
    }

    async function updateRoomHash() {
        requireCrypto();
        state.roomName = currentRoomName();
        state.roomHash = (await sha256Hex("pp-chat-room:" + state.roomName)).slice(0, 16);
        els.roomHash.textContent = state.roomHash;
        els.roomTitle.textContent = state.roomName;
        return state.roomHash;
    }

    async function deriveRoomKey(secret, roomName, salt) {
        if (!secret) {
            throw new Error("Enter the room secret");
        }
        const material = await crypto.subtle.importKey(
            "raw",
            encoder.encode(roomName + "\n" + secret),
            "PBKDF2",
            false,
            ["deriveKey"]
        );
        return crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: PBKDF2_ITERATIONS,
                hash: "SHA-256",
            },
            material,
            { name: "AES-GCM", length: 128 },
            false,
            ["encrypt", "decrypt"]
        );
    }

    async function maybeCompress(bytes) {
        if (!("CompressionStream" in window) || bytes.length < 140) {
            return { bytes: bytes, compressed: false };
        }

        try {
            const stream = new CompressionStream("gzip");
            const writer = stream.writable.getWriter();
            await writer.write(bytes);
            await writer.close();
            const compressed = new Uint8Array(await new Response(stream.readable).arrayBuffer());
            if (compressed.length < bytes.length) {
                return { bytes: compressed, compressed: true };
            }
        } catch (error) {
            return { bytes: bytes, compressed: false };
        }

        return { bytes: bytes, compressed: false };
    }

    async function maybeDecompress(bytes, compressed) {
        if (!compressed) return bytes;
        if (!("DecompressionStream" in window)) {
            throw new Error("Compressed message unsupported by this browser");
        }
        const stream = new DecompressionStream("gzip");
        const writer = stream.writable.getWriter();
        await writer.write(bytes);
        await writer.close();
        return new Uint8Array(await new Response(stream.readable).arrayBuffer());
    }

    async function encryptMessage(message, sender) {
        const roomName = currentRoomName();
        const roomHash = await updateRoomHash();
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await deriveRoomKey(currentSecret(), roomName, salt);
        const timestamp = Date.now();
        const plaintext = encoder.encode(JSON.stringify({
            m: message,
            a: currentAlias(),
            t: timestamp,
        }));
        const packed = await maybeCompress(plaintext);
        const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            packed.bytes
        ));

        return {
            v: 1,
            r: roomHash,
            s: sender,
            t: timestamp,
            z: packed.compressed ? 1 : 0,
            p: bytesToBase64Url(salt),
            i: bytesToBase64Url(iv),
            c: bytesToBase64Url(ciphertext),
        };
    }

    async function decryptEnvelope(envelope, signature, slot, blockTime, signer) {
        const sender = envelope.s || signer || "";
        const message = {
            signature: signature,
            slot: slot || 0,
            blockTime: blockTime || 0,
            timestamp: envelope.t || (blockTime ? blockTime * 1000 : Date.now()),
            sender: sender,
            alias: "",
            text: "",
            locked: false,
            mine: false,
            explorerUrl: window.PiedPiperSolana.memoExplorerUrl(signature),
        };

        if (signer && envelope.s && signer !== envelope.s) {
            message.locked = true;
            message.text = "Signer mismatch";
            return message;
        }

        try {
            const key = await deriveRoomKey(currentSecret(), state.roomName, base64UrlToBytes(envelope.p));
            const plaintext = new Uint8Array(await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: base64UrlToBytes(envelope.i) },
                key,
                base64UrlToBytes(envelope.c)
            ));
            const unpacked = await maybeDecompress(plaintext, envelope.z === 1);
            const decoded = JSON.parse(decoder.decode(unpacked));
            message.text = decoded.m || "";
            message.alias = decoded.a || "";
            message.timestamp = decoded.t || message.timestamp;
        } catch (error) {
            message.locked = true;
            message.text = "Unable to decrypt";
        }

        const currentPublicKey = window.PiedPiperSolana.getState().publicKey;
        message.mine = Boolean(currentPublicKey && sender === currentPublicKey);
        return message;
    }

    function composeMemo(envelope) {
        const payload = bytesToBase64Url(encoder.encode(JSON.stringify(envelope)));
        return MEMO_PREFIX + ":" + envelope.r + ":" + payload;
    }

    function parseMemo(text) {
        if (!text || !text.startsWith(MEMO_PREFIX + ":")) return null;
        const parts = text.split(":");
        if (parts.length < 4) return null;
        const roomHash = parts[2];
        const payload = parts.slice(3).join(":");
        try {
            const envelope = JSON.parse(decoder.decode(base64UrlToBytes(payload)));
            if (envelope.v !== 1 || envelope.r !== roomHash) return null;
            return envelope;
        } catch (error) {
            return null;
        }
    }

    function memoByteLength(memo) {
        return encoder.encode(memo).length;
    }

    function shortAddress(value) {
        if (!value) return "--";
        return value.length > 12 ? value.slice(0, 4) + "..." + value.slice(-4) : value;
    }

    function formatTime(timestamp) {
        return new Date(timestamp).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function extractMemoTexts(parsedTransaction) {
        const instructions = parsedTransaction &&
            parsedTransaction.transaction &&
            parsedTransaction.transaction.message &&
            parsedTransaction.transaction.message.instructions
            ? parsedTransaction.transaction.message.instructions
            : [];

        return instructions.map((instruction) => {
            const programId = instruction.programId && instruction.programId.toString
                ? instruction.programId.toString()
                : String(instruction.programId || "");
            const program = instruction.program || "";
            const parsed = instruction.parsed;

            if (programId !== window.PiedPiperSolana.memoProgramId && program !== "spl-memo") {
                return "";
            }
            if (typeof parsed === "string") return parsed;
            if (parsed && typeof parsed.memo === "string") return parsed.memo;
            if (parsed && parsed.info && typeof parsed.info.memo === "string") return parsed.info.memo;
            return "";
        }).filter(Boolean);
    }

    function signerFromTransaction(parsedTransaction) {
        const keys = parsedTransaction &&
            parsedTransaction.transaction &&
            parsedTransaction.transaction.message &&
            parsedTransaction.transaction.message.accountKeys
            ? parsedTransaction.transaction.message.accountKeys
            : [];
        const signer = keys.find((account) => account.signer);
        if (!signer) return "";
        if (signer.pubkey && signer.pubkey.toString) return signer.pubkey.toString();
        return String(signer.pubkey || signer);
    }

    async function loadParsedTransaction(connection, signature) {
        try {
            return await connection.getParsedTransaction(signature, {
                commitment: "confirmed",
                maxSupportedTransactionVersion: 0,
            });
        } catch (error) {
            return connection.getParsedTransaction(signature, "confirmed");
        }
    }

    async function syncMessages() {
        requireCrypto();
        if (!window.solanaWeb3) {
            throw new Error("Solana web3.js is not loaded");
        }
        if (!currentSecret()) {
            throw new Error("Enter the room secret");
        }

        await updateRoomHash();
        setBusy(true);
        setStatus("Scanning Solana Memo transactions...");

        try {
            const web3 = window.solanaWeb3;
            const solanaState = window.PiedPiperSolana.getState();
            const connection = new web3.Connection(solanaState.endpoint, "confirmed");
            const signatures = await connection.getSignaturesForAddress(
                new web3.PublicKey(window.PiedPiperSolana.memoProgramId),
                { limit: MAX_SCAN_SIGNATURES },
                "confirmed"
            );

            let matched = 0;
            let decrypted = 0;
            for (let index = 0; index < signatures.length; index += 8) {
                const batch = signatures.slice(index, index + 8);
                const transactions = await Promise.all(batch.map((entry) => {
                    return loadParsedTransaction(connection, entry.signature).catch(() => null);
                }));

                for (let txIndex = 0; txIndex < transactions.length; txIndex++) {
                    const parsedTransaction = transactions[txIndex];
                    const signatureInfo = batch[txIndex];
                    if (!parsedTransaction) continue;

                    const signer = signerFromTransaction(parsedTransaction);
                    const memoTexts = extractMemoTexts(parsedTransaction);
                    for (const memoText of memoTexts) {
                        const envelope = parseMemo(memoText);
                        if (!envelope || envelope.r !== state.roomHash) continue;

                        matched++;
                        const message = await decryptEnvelope(
                            envelope,
                            signatureInfo.signature,
                            signatureInfo.slot,
                            signatureInfo.blockTime,
                            signer
                        );
                        if (!message.locked) decrypted++;
                        state.messages.set(signatureInfo.signature, message);
                    }
                }
            }

            renderMessages();
            setStatus("Synced " + decrypted + " / " + matched + " messages");
        } finally {
            setBusy(false);
        }
    }

    function renderMessages() {
        els.messageList.textContent = "";
        const messages = Array.from(state.messages.values())
            .sort((left, right) => {
                if (left.timestamp !== right.timestamp) return left.timestamp - right.timestamp;
                return left.signature.localeCompare(right.signature);
            });

        if (!messages.length) {
            const empty = document.createElement("div");
            empty.className = "empty-state";
            const strong = document.createElement("strong");
            strong.textContent = "No decrypted messages";
            const span = document.createElement("span");
            span.textContent = "Transcript is empty";
            empty.append(strong, span);
            els.messageList.append(empty);
            return;
        }

        messages.forEach((message) => {
            const wrapper = document.createElement("article");
            wrapper.className = "message";
            if (message.mine) wrapper.classList.add("mine");
            if (message.locked) wrapper.classList.add("locked");

            const meta = document.createElement("div");
            meta.className = "message-meta";
            const sender = document.createElement("span");
            sender.textContent = message.alias || shortAddress(message.sender);
            const time = document.createElement("span");
            time.textContent = formatTime(message.timestamp);
            meta.append(sender, time);

            const body = document.createElement("div");
            body.className = "message-body";
            body.textContent = message.text;

            wrapper.append(meta, body);
            if (message.explorerUrl) {
                const link = document.createElement("a");
                link.className = "message-link";
                link.href = message.explorerUrl;
                link.target = "_blank";
                link.rel = "noreferrer";
                link.textContent = "Solana " + shortAddress(message.signature);
                wrapper.append(link);
            }
            els.messageList.append(wrapper);
        });

        els.messageList.scrollTop = els.messageList.scrollHeight;
    }

    async function sendMessage() {
        requireCrypto();
        const text = els.messageInput.value.trim();
        if (!text) return;
        if (!currentSecret()) {
            throw new Error("Enter the room secret");
        }

        setBusy(true);
        setStatus("Connecting wallet...");
        try {
            await window.PiedPiperSolana.connect();
            const solanaState = window.PiedPiperSolana.getState();
            const envelope = await encryptMessage(text, solanaState.publicKey);
            const memo = composeMemo(envelope);
            const memoBytes = memoByteLength(memo);
            els.memoSize.textContent = String(memoBytes);
            if (memoBytes > MAX_MEMO_BYTES) {
                throw new Error("Encrypted message is too large for one Memo transaction");
            }

            setStatus("Waiting for wallet signature...");
            const signature = await window.PiedPiperSolana.sendMemo(memo);
            const explorerUrl = window.PiedPiperSolana.memoExplorerUrl(signature);
            const message = {
                signature: signature,
                slot: 0,
                blockTime: 0,
                timestamp: envelope.t,
                sender: envelope.s,
                alias: currentAlias(),
                text: text,
                locked: false,
                mine: true,
                explorerUrl: explorerUrl,
            };
            state.messages.set(signature, message);
            els.messageInput.value = "";
            updateDraftMeter();
            renderMessages();
            setStatusLink("Sent", signature, explorerUrl);
        } finally {
            setBusy(false);
        }
    }

    function updateDraftMeter() {
        const textLength = els.messageInput.value.length;
        els.charCount.textContent = textLength + " / 420";
        const approximateBytes = textLength ? Math.min(MAX_MEMO_BYTES, Math.round(230 + textLength * 1.65)) : 0;
        els.memoSize.textContent = approximateBytes ? "~" + approximateBytes : "0";
    }

    function bindEvents() {
        els.roomForm.addEventListener("submit", (event) => {
            event.preventDefault();
            state.messages.clear();
            renderMessages();
            updateRoomHash().then(() => {
                if (currentSecret()) return syncMessages();
                setStatus("Room loaded");
                return null;
            }).catch((error) => {
                setStatus(formatError(error));
                setBusy(false);
            });
        });

        els.syncBtn.addEventListener("click", () => {
            syncMessages().catch((error) => {
                setStatus(formatError(error));
                setBusy(false);
            });
        });

        els.composerForm.addEventListener("submit", (event) => {
            event.preventDefault();
            sendMessage().catch((error) => {
                setStatus(formatError(error));
                setBusy(false);
            });
        });

        els.messageInput.addEventListener("input", updateDraftMeter);
        els.roomInput.addEventListener("input", () => {
            updateRoomHash().catch(() => {});
        });
    }

    function initCipherCanvas() {
        const canvas = byId("cipherField");
        const context = canvas.getContext("2d");
        const points = Array.from({ length: 54 }, () => ({
            x: Math.random(),
            y: Math.random(),
            vx: (Math.random() - 0.5) * 0.00045,
            vy: (Math.random() - 0.5) * 0.00045,
        }));

        function resize() {
            const ratio = window.devicePixelRatio || 1;
            canvas.width = Math.floor(window.innerWidth * ratio);
            canvas.height = Math.floor(window.innerHeight * ratio);
            canvas.style.width = window.innerWidth + "px";
            canvas.style.height = window.innerHeight + "px";
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
        }

        function draw() {
            const width = window.innerWidth;
            const height = window.innerHeight;
            context.clearRect(0, 0, width, height);
            context.globalCompositeOperation = "screen";

            points.forEach((point) => {
                point.x += point.vx;
                point.y += point.vy;
                if (point.x < 0 || point.x > 1) point.vx *= -1;
                if (point.y < 0 || point.y > 1) point.vy *= -1;
            });

            for (let left = 0; left < points.length; left++) {
                for (let right = left + 1; right < points.length; right++) {
                    const ax = points[left].x * width;
                    const ay = points[left].y * height;
                    const bx = points[right].x * width;
                    const by = points[right].y * height;
                    const distance = Math.hypot(ax - bx, ay - by);
                    if (distance > 150) continue;
                    context.strokeStyle = "rgba(20, 241, 149, " + (0.12 - distance / 1500) + ")";
                    context.lineWidth = 1;
                    context.beginPath();
                    context.moveTo(ax, ay);
                    context.lineTo(bx, by);
                    context.stroke();
                }
            }

            points.forEach((point, index) => {
                context.fillStyle = index % 3 === 0 ? "rgba(153, 69, 255, 0.62)" : "rgba(75, 183, 255, 0.52)";
                context.beginPath();
                context.arc(point.x * width, point.y * height, 1.8, 0, Math.PI * 2);
                context.fill();
            });

            requestAnimationFrame(draw);
        }

        window.addEventListener("resize", resize);
        resize();
        draw();
    }

    function init() {
        initElements();
        bindEvents();
        initCipherCanvas();
        updateDraftMeter();
        updateRoomHash().catch((error) => setStatus(formatError(error)));
        renderMessages();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
}());
