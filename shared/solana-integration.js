(function () {
    "use strict";

    const scriptEl = document.currentScript;
    const config = Object.assign({
        appName: "PiedPiper",
        mount: "[data-solana-mount]",
        panel: "auto",
        theme: "green",
    }, scriptEl ? scriptEl.dataset : {});

    const STORAGE_KEY = "piedpiper.solana.cluster";
    const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
    const CLUSTERS = {
        "devnet": {
            label: "Devnet",
            endpoint: "https://api.devnet.solana.com",
            explorer: "devnet",
        },
        "mainnet-beta": {
            label: "Mainnet",
            endpoint: "https://api.mainnet-beta.solana.com",
            explorer: "",
        },
        "testnet": {
            label: "Testnet",
            endpoint: "https://api.testnet.solana.com",
            explorer: "testnet",
        },
        "localnet": {
            label: "Localnet",
            endpoint: "http://127.0.0.1:8899",
            explorer: "custom",
        },
    };

    const state = {
        cluster: normalizeCluster(localStorage.getItem(STORAGE_KEY) || config.cluster || "devnet"),
        publicKey: null,
        provider: null,
        ticker: null,
        initialized: false,
    };

    function normalizeCluster(value) {
        return CLUSTERS[value] ? value : "devnet";
    }

    function clusterInfo() {
        return CLUSTERS[state.cluster] || CLUSTERS.devnet;
    }

    function endpoint() {
        return config.rpcUrl || clusterInfo().endpoint;
    }

    function shortAddress(address) {
        if (!address) return "Not connected";
        return address.slice(0, 4) + "..." + address.slice(-4);
    }

    function getWeb3() {
        return window.solanaWeb3 || null;
    }

    function getWalletProvider() {
        if (window.solana && window.solana.isPhantom) return window.solana;
        if (window.solflare && window.solflare.isSolflare) return window.solflare;
        if (window.solana) return window.solana;
        return null;
    }

    function all(selector) {
        return Array.from(document.querySelectorAll(selector));
    }

    function setText(selector, value) {
        all(selector).forEach((el) => {
            el.textContent = value;
        });
    }

    function setHtml(selector, value) {
        all(selector).forEach((el) => {
            el.innerHTML = value;
        });
    }

    function setBusy(selector, busy) {
        all(selector).forEach((el) => {
            el.disabled = busy;
        });
    }

    function buildPanel() {
        const panel = document.createElement("section");
        panel.className = "pp-solana-panel";
        panel.dataset.theme = config.theme || "green";
        panel.innerHTML = [
            '<div class="pp-solana-main">',
            '  <div class="pp-solana-title"><span class="pp-solana-dot"></span><strong>Solana</strong><span data-pp-solana-cluster-label>Devnet</span></div>',
            '  <div class="pp-solana-meta">',
            '    <span>Slot <span data-pp-solana-slot>--</span></span>',
            '    <span>Epoch <span data-pp-solana-epoch>--</span></span>',
            '    <span>Finalized <span data-pp-solana-finalized>--</span></span>',
            '    <span>TPS <span data-pp-solana-tps>--</span></span>',
            '    <span data-pp-solana-wallet-status>Wallet not connected</span>',
            '  </div>',
            '</div>',
            '<div class="pp-solana-controls">',
            '  <select class="pp-solana-select" data-pp-solana-cluster aria-label="Solana cluster">',
            '    <option value="devnet">Devnet</option>',
            '    <option value="mainnet-beta">Mainnet</option>',
            '    <option value="testnet">Testnet</option>',
            '    <option value="localnet">Localnet</option>',
            '  </select>',
            '  <button class="pp-solana-button" type="button" data-pp-solana-connect>Connect Wallet</button>',
            '</div>',
        ].join("");
        return panel;
    }

    function mountPanel() {
        if (config.panel === "none") return;
        if (document.querySelector(".pp-solana-panel")) return;

        const mount = document.querySelector(config.mount);
        if (mount) {
            mount.appendChild(buildPanel());
            return;
        }

        const container = document.querySelector(".container") || document.body;
        container.insertBefore(buildPanel(), container.firstChild);
    }

    function syncClusterUi() {
        const info = clusterInfo();
        all("[data-pp-solana-cluster]").forEach((select) => {
            select.value = state.cluster;
        });
        setText("[data-pp-solana-cluster-label]", info.label);
        setText(".chain-name strong + span", info.label);
    }

    function updateWalletUi() {
        const connected = Boolean(state.publicKey);
        const label = connected ? shortAddress(state.publicKey.toString()) : "Connect Wallet";
        const status = connected ? "Wallet " + shortAddress(state.publicKey.toString()) : "Wallet not connected";

        setText("[data-pp-solana-wallet-status], #walletStatus", status);
        all("[data-pp-solana-connect], #walletBtn").forEach((button) => {
            button.textContent = connected ? label : "Connect Wallet";
            button.classList.toggle("connected", connected);
        });
    }

    async function rpc(method, params) {
        const response = await fetch(endpoint(), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: "piedpiper-" + Date.now(),
                method: method,
                params: params || [],
            }),
        });

        if (!response.ok) {
            throw new Error("RPC HTTP " + response.status);
        }

        const json = await response.json();
        if (json.error) {
            throw new Error(json.error.message || "RPC error");
        }
        return json.result;
    }

    function formatNumber(value) {
        if (value === null || value === undefined || Number.isNaN(Number(value))) return "--";
        return Number(value).toLocaleString();
    }

    async function refreshChainInfo() {
        syncClusterUi();
        try {
            const epochInfo = await rpc("getEpochInfo");
            let tps = "--";
            try {
                const samples = await rpc("getRecentPerformanceSamples", [1]);
                if (samples && samples[0] && samples[0].samplePeriodSecs) {
                    tps = Math.round(samples[0].numTransactions / samples[0].samplePeriodSecs);
                }
            } catch (err) {
                tps = "--";
            }

            setText("[data-pp-solana-slot], #slotDisplay, #tickerSlot", formatNumber(epochInfo.absoluteSlot));
            setText("[data-pp-solana-epoch], #tickerEpoch", formatNumber(epochInfo.epoch));
            setText("[data-pp-solana-finalized], #tickerFinalized", formatNumber(epochInfo.blockHeight));
            setText("[data-pp-solana-tps], #tickerTPS", formatNumber(tps));
        } catch (err) {
            setText("[data-pp-solana-slot], #slotDisplay, #tickerSlot", "offline");
            setText("[data-pp-solana-epoch], #tickerEpoch", "--");
            setText("[data-pp-solana-finalized], #tickerFinalized", "--");
            setText("[data-pp-solana-tps], #tickerTPS", "--");
        }
    }

    function startTicker() {
        if (state.ticker) window.clearInterval(state.ticker);
        refreshChainInfo();
        state.ticker = window.setInterval(refreshChainInfo, 15000);
    }

    async function connectWallet() {
        const provider = getWalletProvider();
        if (!provider) {
            setText("[data-pp-solana-wallet-status], #walletStatus", "Install a Solana wallet");
            throw new Error("No Solana wallet provider was found");
        }

        state.provider = provider;
        const response = await provider.connect();
        state.publicKey = response && response.publicKey ? response.publicKey : provider.publicKey;
        updateWalletUi();
        return state.publicKey;
    }

    async function disconnectWallet() {
        if (state.provider && state.provider.disconnect) {
            await state.provider.disconnect();
        }
        state.publicKey = null;
        updateWalletUi();
    }

    async function toggleWallet() {
        if (state.publicKey) {
            await disconnectWallet();
            return null;
        }
        return connectWallet();
    }

    function setCluster(cluster) {
        state.cluster = normalizeCluster(cluster);
        localStorage.setItem(STORAGE_KEY, state.cluster);
        syncClusterUi();
        startTicker();
    }

    async function sha256Hex(value) {
        const input = typeof value === "string" ? value : JSON.stringify(value);
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
        return Array.from(new Uint8Array(digest))
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("");
    }

    function memoExplorerUrl(signature) {
        if (state.cluster === "localnet") return "";
        const suffix = clusterInfo().explorer ? "?cluster=" + clusterInfo().explorer : "";
        return "https://explorer.solana.com/tx/" + signature + suffix;
    }

    function compactMemo(meta) {
        return JSON.stringify({
            app: "PiedPiper",
            module: meta.module || "core",
            kind: meta.kind || "proof",
            label: meta.label || "state",
            hash: meta.hash,
            ts: meta.timestamp,
        });
    }

    function resolveStatusElement(statusElement) {
        if (!statusElement) return null;
        if (typeof statusElement === "string") return document.querySelector(statusElement);
        return statusElement;
    }

    function setStatus(statusElement, message, asHtml) {
        const el = resolveStatusElement(statusElement);
        if (!el) return;
        if (asHtml) {
            el.innerHTML = message;
        } else {
            el.textContent = message;
        }
    }

    function formatError(err) {
        if (!err) return "Unknown error";
        const message = err.message || String(err);
        if (/reject/i.test(message)) return "Wallet rejected the request";
        if (/insufficient/i.test(message)) return "Insufficient SOL for transaction fee";
        return message;
    }

    async function sendMemo(memo) {
        const web3 = getWeb3();
        if (!web3) {
            throw new Error("Solana web3.js is not loaded");
        }

        if (!state.publicKey) {
            await connectWallet();
        }

        const connection = new web3.Connection(endpoint(), "confirmed");
        const latest = await connection.getLatestBlockhash("confirmed");
        const memoIx = new web3.TransactionInstruction({
            programId: new web3.PublicKey(MEMO_PROGRAM_ID),
            keys: [{
                pubkey: state.publicKey,
                isSigner: true,
                isWritable: false,
            }],
            data: new TextEncoder().encode(memo),
        });

        const tx = new web3.Transaction();
        tx.feePayer = state.publicKey;
        tx.recentBlockhash = latest.blockhash;
        tx.add(memoIx);

        let signature;
        if (state.provider.signAndSendTransaction) {
            const result = await state.provider.signAndSendTransaction(tx);
            signature = typeof result === "string" ? result : result.signature;
        } else if (state.provider.signTransaction) {
            const signed = await state.provider.signTransaction(tx);
            signature = await connection.sendRawTransaction(signed.serialize());
        } else {
            throw new Error("Wallet does not support transaction signing");
        }

        await connection.confirmTransaction({
            signature: signature,
            blockhash: latest.blockhash,
            lastValidBlockHeight: latest.lastValidBlockHeight,
        }, "confirmed");

        return signature;
    }

    async function recordProof(options) {
        const opts = options || {};
        const payload = typeof opts.payload === "function" ? opts.payload() : opts.payload;
        if (payload === undefined || payload === null || payload === "") {
            throw new Error("No proof payload was provided");
        }

        const statusElement = opts.statusElement;
        setStatus(statusElement, "Hashing proof payload...");

        const hash = await sha256Hex(payload);
        const memo = compactMemo({
            module: opts.module,
            kind: opts.kind,
            label: opts.label,
            hash: hash,
            timestamp: new Date().toISOString(),
        });

        setStatus(statusElement, "Waiting for wallet signature...");
        const signature = await sendMemo(memo);
        const explorerUrl = memoExplorerUrl(signature);

        if (explorerUrl) {
            setStatus(statusElement, 'Recorded: <a href="' + explorerUrl + '" target="_blank" rel="noreferrer">' + shortAddress(signature) + "</a>", true);
        } else {
            setStatus(statusElement, "Recorded: " + shortAddress(signature));
        }

        return {
            signature: signature,
            explorerUrl: explorerUrl,
            hash: hash,
            memo: memo,
            cluster: state.cluster,
        };
    }

    function bindUi() {
        all("[data-pp-solana-cluster]").forEach((select) => {
            select.addEventListener("change", function () {
                setCluster(this.value);
            });
        });

        all("[data-pp-solana-connect], #walletBtn").forEach((button) => {
            button.addEventListener("click", function (event) {
                event.preventDefault();
                toggleWallet().catch((err) => {
                    setText("[data-pp-solana-wallet-status], #walletStatus", formatError(err));
                });
            });
        });

        if (window.solana && window.solana.on) {
            window.solana.on("disconnect", function () {
                state.publicKey = null;
                updateWalletUi();
            });
            window.solana.on("accountChanged", function (publicKey) {
                state.publicKey = publicKey || null;
                updateWalletUi();
            });
        }
    }

    function init() {
        if (state.initialized) return;
        state.initialized = true;
        mountPanel();
        syncClusterUi();
        bindUi();
        updateWalletUi();
        startTicker();
    }

    window.PiedPiperSolana = {
        init: init,
        connect: connectWallet,
        disconnect: disconnectWallet,
        toggleWallet: toggleWallet,
        setCluster: setCluster,
        refreshChainInfo: refreshChainInfo,
        recordProof: recordProof,
        sendMemo: sendMemo,
        memoExplorerUrl: memoExplorerUrl,
        memoProgramId: MEMO_PROGRAM_ID,
        hashText: sha256Hex,
        getState: function () {
            return {
                cluster: state.cluster,
                endpoint: endpoint(),
                publicKey: state.publicKey ? state.publicKey.toString() : null,
            };
        },
    };

    window.connectWallet = toggleWallet;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
}());
