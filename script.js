// ==========================================
// CANDY AI - DERIV VOLATILITY SCANNER
// ==========================================

const status = document.getElementById("status");
const tick = document.getElementById("tick");
const signal = document.getElementById("signal");
const confidence = document.getElementById("confidence");
const strength = document.getElementById("strength");

// ==========================================
// SETTINGS
// ==========================================

const WINDOW = 30;
const MIN_CONFIDENCE = 60;

let ws = null;
let symbols = [];
let selectedSymbol = null;
let reconnectTimer = null;

const marketData = {};

// ==========================================
// MARKET SELECTOR
// ==========================================

const controls = document.createElement("div");

controls.style.margin = "15px 0";
controls.style.padding = "12px";
controls.style.borderRadius = "12px";
controls.style.background = "#222";
controls.style.color = "white";

controls.innerHTML = `
    <label style="
        display:block;
        margin-bottom:8px;
        font-weight:bold;
    ">
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
        border:1px solid #555;
        ">
        <option>Loading markets...</option>
    </select>

    <div id="marketCount"
        style="
        margin-top:8px;
        font-size:13px;
        ">
        Connecting to Deriv...
    </div>
`;

document.body.insertBefore(
    controls,
    document.body.firstChild
);

const marketSelect =
    document.getElementById("marketSelect");

const marketCount =
    document.getElementById("marketCount");

// ==========================================
// CONNECT
// ==========================================

function connect() {

    if (
        ws &&
        (
            ws.readyState === WebSocket.OPEN ||
            ws.readyState === WebSocket.CONNECTING
        )
    ) {
        return;
    }

    status.textContent =
        "CONNECTING TO DERIV...";

    strength.textContent =
        "Opening market connection...";

    ws = new WebSocket(
        "wss://api.derivws.com/trading/v1/options/ws/public"
    );

    // ======================================
    // OPEN
    // ======================================

    ws.onopen = function () {

        console.log("DERIV CONNECTED");

        status.textContent =
            "CONNECTED 🟢";

        marketCount.textContent =
            "Requesting Volatility markets...";

        // Current Deriv API active-symbol request
        ws.send(JSON.stringify({
            active_symbols: "brief",
            req_id: 1
        }));
    };

    // ======================================
    // MESSAGE
    // ======================================

    ws.onmessage = function(event) {

        let data;

        try {

            data = JSON.parse(event.data);

        } catch (error) {

            console.error(
                "Invalid Deriv message:",
                event.data
            );

            return;
        }

        console.log("DERIV:", data);

        // ====================================
        // ERROR
        // ====================================

        if (data.error) {

            console.error(
                "DERIV API ERROR:",
                data.error
            );

            status.textContent =
                "API ERROR ❌";

            signal.textContent =
                data.error.message ||
                "Deriv API error";

            strength.textContent =
                "Request rejected";

            return;
        }

        // ====================================
        // ACTIVE SYMBOLS
        // ====================================

        if (
            data.msg_type === "active_symbols" &&
            Array.isArray(data.active_symbols)
        ) {

            symbols = data.active_symbols

                .map(item => {

                    return {

                        symbol:
                            item.underlying_symbol,

                        name:
                            item.underlying_symbol_name,

                        market:
                            item.market,

                        submarket:
                            item.submarket
                    };

                })

                .filter(item => {

                    if (!item.symbol) {
                        return false;
                    }

                    const text =
                        (
                            item.name +
                            " " +
                            item.symbol +
                            " " +
                            item.market +
                            " " +
                            item.submarket
                        ).toLowerCase();

                    return (
                        text.includes("volatility") ||
                        /[0-9]+hz[0-9]+v/i.test(
                            item.symbol
                        ) ||
                        /r_[0-9]+/i.test(
                            item.symbol
                        );
                    });

            // Remove duplicates
            const unique = {};

            symbols.forEach(item => {

                unique[item.symbol] = item;
            });

            symbols =
                Object.values(unique);

            symbols.sort((a, b) =>
                a.name.localeCompare(b.name)
            );

            console.log(
                "VOLATILITY SYMBOLS:",
                symbols
            );

            if (symbols.length === 0) {

                status.textContent =
                    "NO VOLATILITY MARKETS ❌";

                marketCount.textContent =
                    "No Volatility symbols returned.";

                strength.textContent =
                    "Check the Deriv response.";

                return;
            }

            // Build selector
            buildMarketList();

            // Select first market
            selectedSymbol =
                symbols[0].symbol;

            marketSelect.value =
                selectedSymbol;

            // Prepare data
            symbols.forEach(item => {

                marketData[item.symbol] = {

                    prices: [],

                    rise: 0,

                    fall: 0,

                    lastPrice: null,

                    ticks: 0
                };

            });

            // Subscribe ONLY to selected market
            subscribeToMarket(
                selectedSymbol
            );

            status.textContent =
                "LIVE VOLATILITY DATA 🟢";

            strength.textContent =
                "Waiting for ticks...";

            marketCount.textContent =
                symbols.length +
                " Volatility markets found.";

            updateDisplay();
        }

        // ====================================
        // TICK
        // ====================================

        if (
            data.msg_type === "tick" &&
            data.tick
        ) {

            const symbol =
                data.tick.underlying_symbol ||
                data.tick.symbol;

            const price =
                Number(data.tick.quote);

            if (
                !symbol ||
                !Number.isFinite(price)
            ) {
                return;
            }

            processTick(
                symbol,
                price
            );
        }
    };

    // ======================================
    // ERROR
    // ======================================

    ws.onerror = function(error) {

        console.error(
            "WebSocket error:",
            error
        );

        status.textContent =
            "WEBSOCKET ERROR ❌";

        strength.textContent =
            "Connection problem";
    };

    // ======================================
    // CLOSED
    // ======================================

    ws.onclose = function(event) {

        console.log(
            "WebSocket closed:",
            event.code,
            event.reason
        );

        status.textContent =
            "CONNECTION CLOSED 🔴";

        strength.textContent =
            "Reconnecting...";

        clearTimeout(
            reconnectTimer
        );

        reconnectTimer =
            setTimeout(
                connect,
                3000
            );
    };
}

// ==========================================
// SUBSCRIBE TO MARKET
// ==========================================

function subscribeToMarket(symbol) {

    if (
        !ws ||
        ws.readyState !== WebSocket.OPEN
    ) {
        return;
    }

    console.log(
        "SUBSCRIBING TO:",
        symbol
    );

    ws.send(JSON.stringify({

        ticks: symbol,

        subscribe: 1,

        req_id:
            Math.floor(
                Math.random() * 1000000
            )

    }));

    status.textContent =
        "SUBSCRIBED 🟢";

    strength.textContent =
        "Receiving market data...";
}

// ==========================================
// BUILD MARKET LIST
// ==========================================

function buildMarketList() {

    marketSelect.innerHTML = "";

    symbols.forEach(item => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            item.symbol;

        option.textContent =
            item.name +
            " (" +
            item.symbol +
            ")";

        marketSelect.appendChild(
            option
        );
    });
}

// ==========================================
// MARKET CHANGED
// ==========================================

marketSelect.addEventListener(
    "change",
    function() {

        selectedSymbol =
            this.value;

        console.log(
            "Selected:",
            selectedSymbol
        );

        resetMainDisplay();

        subscribeToMarket(
            selectedSymbol
        );

        updateDisplay();
    }
);

// ==========================================
// PROCESS TICK
// ==========================================

function processTick(
    symbol,
    price
) {

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

    // Compare price
    if (
        data.lastPrice !== null
    ) {

        if (
            price >
            data.lastPrice
        ) {

            data.rise++;

        } else if (
            price <
            data.lastPrice
        ) {

            data.fall++;
        }
    }

    data.lastPrice =
        price;

    data.prices.push(
        price
    );

    data.ticks++;

    // Keep latest 30 prices
    if (
        data.prices.length >
        WINDOW
    ) {

        data.prices.shift();

        recalculateCounts(
            data
        );
    }

    // Update screen
    if (
        symbol === selectedSymbol
    ) {

        updateDisplay();
    }
}

// ==========================================
// RECALCULATE
// ==========================================

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

// ==========================================
// UPDATE DISPLAY
// ==========================================

function updateDisplay() {

    if (!selectedSymbol) {
        return;
    }

    const data =
        marketData[selectedSymbol];

    if (
        !data ||
        data.lastPrice === null
    ) {

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
        data.rise +
        data.fall;

    tick.textContent =
        data.lastPrice;

    // Need enough movement
    if (total < 5) {

        signal.textContent =
            "WAIT ⏳";

        confidence.textContent =
            Math.round(
                total > 0
                    ? Math.max(
                        (data.rise / total) * 100,
                        (data.fall / total) * 100
                    )
                    : 50
            ) + "%";

        strength.textContent =
            "Collecting | Rise: " +
            data.rise +
            " | Fall: " +
            data.fall +
            " | Ticks: " +
            data.ticks;

        return;
    }

    const risePercent =
        (
            data.rise /
            total
        ) * 100;

    const fallPercent =
        (
            data.fall /
            total
        ) * 100;

    let currentSignal =
        "WAIT ⏳";

    let currentConfidence =
        Math.round(
            Math.max(
                risePercent,
                fallPercent
            )
        );

    // ======================================
    // SIGNAL
    // ======================================

    if (
        risePercent >= MIN_CONFIDENCE &&
        risePercent > fallPercent
    ) {

        currentSignal =
            "⬆️ RISE";

    } else if (
        fallPercent >= MIN_CONFIDENCE &&
        fallPercent > risePercent
    ) {

        currentSignal =
            "⬇️ FALL";
    }

    // ======================================
    // STRENGTH
    // ======================================

    let currentStrength =
        "WEAK";

    if (
        currentConfidence >= 75
    ) {

        currentStrength =
            "STRONG";

    } else if (
        currentConfidence >= 65
    ) {

        currentStrength =
            "MEDIUM";
    }

    // ======================================
    // DISPLAY
    // ======================================

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

// ==========================================
// RESET
// ==========================================

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

// ==========================================
// START
// ==========================================

connect();
