// ==========================================
// CANDY AI - DERIV VOLATILITY SCANNER
// ==========================================

const status = document.getElementById("status");
const tick = document.getElementById("tick");
const signal = document.getElementById("signal");
const confidence = document.getElementById("confidence");
const strength = document.getElementById("strength");

// -------------------------------
// Scanner settings
// -------------------------------

const WINDOW = 30;
const MIN_CONFIDENCE = 60;

// -------------------------------
// Scanner data
// -------------------------------

let symbols = [];
let selectedSymbol = null;
let ws = null;

const marketData = {};

// -------------------------------
// Create market selector
// -------------------------------

const controls = document.createElement("div");

controls.style.margin = "15px 0";
controls.style.padding = "12px";
controls.style.borderRadius = "12px";
controls.style.background = "#222";
controls.style.color = "white";

controls.innerHTML = `
    <label style="display:block;margin-bottom:8px;font-weight:bold;">
        Select Volatility Market
    </label>

    <select id="marketSelect"
        style="
        width:100%;
        padding:12px;
        border-radius:8px;
        font-size:16px;
        background:#111;
        color:white;
        border:1px solid #555;">
        <option>Loading markets...</option>
    </select>

    <div id="marketCount"
        style="margin-top:8px;font-size:13px;">
        Searching Deriv markets...
    </div>
`;

document.body.insertBefore(controls, document.body.firstChild);

const marketSelect = document.getElementById("marketSelect");
const marketCount = document.getElementById("marketCount");

// -------------------------------
// Connect to Deriv
// -------------------------------

function connect() {

    status.textContent = "Connecting to Deriv...";

    ws = new WebSocket(
        "wss://api.derivws.com/trading/v1/options/ws/public"
    );

    ws.onopen = function () {

        console.log("DERIV CONNECTED");

        status.textContent = "CONNECTED 🟢";
        strength.textContent = "Finding Volatility markets...";

        // Ask Deriv for currently active symbols
        ws.send(JSON.stringify({
            active_symbols: "brief",
            req_id: 1
        }));
    };

    ws.onmessage = function (event) {

        console.log("DERIV:", event.data);

        let data;

        try {
            data = JSON.parse(event.data);
        } catch (error) {
            console.log("Invalid JSON:", event.data);
            return;
        }

        // -------------------------------
        // API error
        // -------------------------------

        if (data.error) {

            console.error("Deriv error:", data.error);

            status.textContent = "API ERROR ❌";
            signal.textContent =
                data.error.message || "API error";

            strength.textContent = "Request rejected";

            return;
        }

        // -------------------------------
        // Active symbols
        // -------------------------------

        if (
            data.msg_type === "active_symbols" &&
            Array.isArray(data.active_symbols)
        ) {

            symbols = data.active_symbols
                .map(item => {

                    const symbol =
                        item.underlying_symbol ||
                        item.symbol;

                    const name =
                        item.underlying_symbol_name ||
                        item.display_name ||
                        symbol;

                    return {
                        symbol: symbol,
                        name: name
                    };
                })
                .filter(item => {

                    return /volatility/i.test(item.name);
                })
                .sort((a, b) =>
                    a.name.localeCompare(b.name)
                );

            console.log(
                "VOLATILITY MARKETS:",
                symbols
            );

            if (symbols.length === 0) {

                status.textContent =
                    "NO VOLATILITY MARKETS ❌";

                strength.textContent =
                    "Deriv returned no Volatility symbols.";

                return;
            }

            buildMarketList();

            // Subscribe to every available
            // Volatility market.
            symbols.forEach(item => {

                marketData[item.symbol] = {
                    prices: [],
                    rise: 0,
                    fall: 0,
                    lastPrice: null,
                    ticks: 0
                };

                subscribeToMarket(item.symbol);
            });

            selectedSymbol = symbols[0].symbol;

            marketSelect.value = selectedSymbol;

            updateDisplay();

            status.textContent =
                "LIVE VOLATILITY DATA 🟢";

            strength.textContent =
                symbols.length +
                " Volatility markets connected";
        }

        // -------------------------------
        // Live tick
        // -------------------------------

        if (data.msg_type === "tick" && data.tick) {

            const symbol =
                data.tick.underlying_symbol ||
                data.tick.symbol;

            const price =
                Number(data.tick.quote);

            if (!symbol || !Number.isFinite(price)) {
                return;
            }

            processTick(symbol, price);
        }
    };

    // -------------------------------
    // WebSocket error
    // -------------------------------

    ws.onerror = function (error) {

        console.error(
            "WebSocket error:",
            error
        );

        status.textContent =
            "WEBSOCKET ERROR ❌";

        strength.textContent =
            "Connection failed";
    };

    // -------------------------------
    // WebSocket closed
    // -------------------------------

    ws.onclose = function (event) {

        console.log(
            "WebSocket closed:",
            event.code,
            event.reason
        );

        status.textContent =
            "CONNECTION CLOSED 🔴";

        strength.textContent =
            "Reconnecting...";

        setTimeout(connect, 3000);
    };
}

// -------------------------------
// Subscribe to one market
// -------------------------------

function subscribeToMarket(symbol) {

    if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
    }

    ws.send(JSON.stringify({

        ticks: symbol,

        subscribe: 1,

        req_id:
            Math.floor(
                Math.random() * 100000
            )

    }));

    console.log(
        "Subscribed:",
        symbol
    );
}

// -------------------------------
// Build market dropdown
// -------------------------------

function buildMarketList() {

    marketSelect.innerHTML = "";

    symbols.forEach(item => {

        const option =
            document.createElement("option");

        option.value = item.symbol;

        option.textContent =
            item.name;

        marketSelect.appendChild(option);
    });

    marketCount.textContent =
        symbols.length +
        " Volatility markets found on Deriv.";
}

// -------------------------------
// Market selection
// -------------------------------

marketSelect.addEventListener(
    "change",
    function () {

        selectedSymbol =
            this.value;

        resetMainDisplay();

        updateDisplay();
    }
);

// -------------------------------
// Process incoming tick
// -------------------------------

function processTick(symbol, price) {

    if (!marketData[symbol]) {

        marketData[symbol] = {

            prices: [],
            rise: 0,
            fall: 0,
            lastPrice: null,
            ticks: 0

        };
    }

    const data =
        marketData[symbol];

    // Compare with previous price
    if (data.lastPrice !== null) {

        if (price > data.lastPrice) {

            data.rise++;

        } else if (price < data.lastPrice) {

            data.fall++;
        }
    }

    data.lastPrice = price;

    data.prices.push(price);

    data.ticks++;

    // Keep only recent movement
    if (data.prices.length > WINDOW) {

        data.prices.shift();
    }

    // Keep counts aligned with window
    const movementCount =
        data.rise + data.fall;

    if (movementCount > WINDOW - 1) {

        recalculateCounts(data);
    }

    // Update selected market
    if (symbol === selectedSymbol) {

        updateDisplay();
    }
}

// -------------------------------
// Recalculate recent movement
// -------------------------------

function recalculateCounts(data) {

    data.rise = 0;
    data.fall = 0;

    for (
        let i = 1;
        i < data.prices.length;
        i++
    ) {

        if (
            data.prices[i] >
            data.prices[i - 1]
        ) {

            data.rise++;

        } else if (
            data.prices[i] <
            data.prices[i - 1]
        ) {

            data.fall++;
        }
    }
}

// -------------------------------
// Update scanner display
// -------------------------------

function updateDisplay() {

    if (!selectedSymbol) {
        return;
    }

    const data =
        marketData[selectedSymbol];

    if (!data || data.lastPrice === null) {

        tick.textContent =
            "Waiting...";

        signal.textContent =
            "WAIT ⏳";

        confidence.textContent =
            "Collecting";

        strength.textContent =
            "Waiting for ticks";

        return;
    }

    const total =
        data.rise + data.fall;

    if (total < 5) {

        tick.textContent =
            data.lastPrice;

        signal.textContent =
            "WAIT ⏳";

        confidence.textContent =
            "Collecting";

        strength.textContent =
            "Need more ticks";

        return;
    }

    const risePercent =
        (data.rise / total) * 100;

    const fallPercent =
        (data.fall / total) * 100;

    let currentSignal =
        "WAIT ⏳";

    let currentConfidence = 50;

    let currentStrength =
        "Weak";

    // -------------------------------
    // Signal engine
    // -------------------------------

    if (
        risePercent >= MIN_CONFIDENCE &&
        risePercent > fallPercent
    ) {

        currentSignal =
            "⬆️ RISE";

        currentConfidence =
            Math.round(risePercent);

    } else if (
        fallPercent >= MIN_CONFIDENCE &&
        fallPercent > risePercent
    ) {

        currentSignal =
            "⬇️ FALL";

        currentConfidence =
            Math.round(fallPercent);

    } else {

        currentSignal =
            "WAIT ⏳";

        currentConfidence =
            Math.round(
                Math.max(
                    risePercent,
                    fallPercent
                )
            );
    }

    // -------------------------------
    // Strength
    // -------------------------------

    if (currentConfidence >= 75) {

        currentStrength =
            "STRONG";

    } else if (currentConfidence >= 65) {

        currentStrength =
            "MEDIUM";

    } else {

        currentStrength =
            "WEAK";
    }

    // -------------------------------
    // Display
    // -------------------------------

    tick.textContent =
        data.lastPrice;

    signal.textContent =
        currentSignal;

    confidence.textContent =
        currentConfidence + "%";

    strength.textContent =
        currentStrength +
        " | Rise: " +
        data.rise +
        " | Fall: " +
        data.fall +
        " | Ticks: " +
        data.ticks;
}

// -------------------------------
// Reset display when market changes
// -------------------------------

function resetMainDisplay() {

    tick.textContent =
        "Loading...";

    signal.textContent =
        "WAIT ⏳";

    confidence.textContent =
        "Collecting";

    strength.textContent =
        "Loading selected market...";
}

// -------------------------------
// Start
// -------------------------------

connect();
