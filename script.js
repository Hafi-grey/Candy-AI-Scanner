// ==========================================
// CANDY AI - STRONGER RISE/FALL SCANNER
// ==========================================

const status = document.getElementById("status");
const tick = document.getElementById("tick");
const signal = document.getElementById("signal");
const confidence = document.getElementById("confidence");
const strength = document.getElementById("strength");

const WINDOW = 30;
const MIN_CONFIDENCE = 60;

let ws = null;
let symbols = [];
let selectedSymbol = null;

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
Connecting...
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

    status.textContent =
        "CONNECTING...";

    ws = new WebSocket(
        "wss://api.derivws.com/trading/v1/options/ws/public"
    );

    ws.onopen = function () {

        status.textContent =
            "CONNECTED 🟢";

        ws.send(JSON.stringify({
            active_symbols: "brief",
            req_id: 1
        }));
    };

    ws.onmessage = function(event) {

        let data;

        try {
            data = JSON.parse(event.data);
        } catch {
            return;
        }

        console.log("DERIV:", data);

        // ==================================
        // ERROR
        // ==================================

        if (data.error) {

            status.textContent =
                "API ERROR ❌";

            signal.textContent =
                data.error.message;

            return;
        }

        // ==================================
        // MARKETS
        // ==================================

        if (
            data.msg_type === "active_symbols" &&
            Array.isArray(data.active_symbols)
        ) {

            symbols = data.active_symbols
                .map(item => ({
                    symbol:
                        item.underlying_symbol ||
                        item.symbol,

                    name:
                        item.underlying_symbol_name ||
                        item.display_name ||
                        item.symbol
                }))
                .filter(item => {

                    return (
                        /volatility/i.test(
                            item.name
                        ) ||
                        /R_[0-9]+/i.test(
                            item.symbol
                        )
                    );
                });

            const unique = {};

            symbols.forEach(item => {
                unique[item.symbol] = item;
            });

            symbols =
                Object.values(unique);

            symbols.sort((a,b) =>
                a.name.localeCompare(b.name)
            );

            if (!symbols.length) {

                status.textContent =
                    "NO MARKETS ❌";

                return;
            }

            buildMarketList();

            symbols.forEach(item => {

                marketData[item.symbol] = {

                    prices: [],

                    rise: 0,

                    fall: 0,

                    lastPrice: null,

                    ticks: 0
                };
            });

            selectedSymbol =
                symbols[0].symbol;

            marketSelect.value =
                selectedSymbol;

            subscribeToMarket(
                selectedSymbol
            );

            status.textContent =
                "LIVE TICK 🟢";

            marketCount.textContent =
                symbols.length +
                " Volatility markets found.";

            updateDisplay();
        }

        // ==================================
        // LIVE TICK
        // ==================================

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

    ws.onerror = function() {

        status.textContent =
            "WEBSOCKET ERROR ❌";
    };

    ws.onclose = function() {

        status.textContent =
            "CONNECTION CLOSED 🔴";

        setTimeout(
            connect,
            3000
        );
    };
}

// ==========================================
// SUBSCRIBE
// ==========================================

function subscribeToMarket(symbol) {

    if (
        !ws ||
        ws.readyState !== WebSocket.OPEN
    ) {
        return;
    }

    ws.send(JSON.stringify({

        ticks: symbol,

        subscribe: 1,

        req_id:
            Math.floor(
                Math.random() * 1000000
            )
    }));
}

// ==========================================
// BUILD LIST
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
// CHANGE MARKET
// ==========================================

marketSelect.addEventListener(
    "change",
    function() {

        selectedSymbol =
            this.value;

        resetDisplay();

        subscribeToMarket(
            selectedSymbol
        );
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

    if (
        data.prices.length >
        WINDOW
    ) {

        data.prices.shift();

        recalculate(
            data
        );
    }

    if (
        symbol === selectedSymbol
    ) {

        updateDisplay();
    }
}

// ==========================================
// RECALCULATE WINDOW
// ==========================================

function recalculate(data) {

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
// SIGNAL ENGINE
// ==========================================

function updateDisplay() {

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
            "0%";

        strength.textContent =
            "Collecting data";

        return;
    }

    const total =
        data.rise +
        data.fall;

    tick.textContent =
        data.lastPrice;

    if (total < 10) {

        signal.textContent =
            "WAIT ⏳";

        confidence.textContent =
            "Collecting";

        strength.textContent =
            "Need more movement";

        return;
    }

    const rise =
        (data.rise / total) * 100;

    const fall =
        (data.fall / total) * 100;

    const confidenceValue =
        Math.round(
            Math.max(
                rise,
                fall
            )
        );

    let finalSignal =
        "WAIT ⏳";

    let finalStrength =
        "WEAK";

    // ==================================
    // STRICT SIGNAL
    // ==================================

    if (
        rise >= 75 &&
        rise > fall
    ) {

        finalSignal =
            "⬆️ STRONG RISE";

        finalStrength =
            "STRONG";

    } else if (
        fall >= 75 &&
        fall > rise
    ) {

        finalSignal =
            "⬇️ STRONG FALL";

        finalStrength =
            "STRONG";

    } else if (
        rise >= 65 &&
        rise > fall
    ) {

        finalSignal =
            "⬆️ RISE";

        finalStrength =
            "MEDIUM";

    } else if (
        fall >= 65 &&
        fall > rise
    ) {

        finalSignal =
            "⬇️ FALL";

        finalStrength =
            "MEDIUM";

    } else if (
        rise >= 60 &&
        rise > fall
    ) {

        finalSignal =
            "⬆️ WATCH RISE";

        finalStrength =
            "WEAK";

    } else if (
        fall >= 60 &&
        fall > rise
    ) {

        finalSignal =
            "⬇️ WATCH FALL";

        finalStrength =
            "WEAK";
    }

    // ==================================
    // DISPLAY
    // ==================================

    confidence.textContent =
        confidenceValue + "%";

    signal.textContent =
        finalSignal;

    strength.textContent =
        finalStrength +
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

function resetDisplay() {

    tick.textContent =
        "Loading...";

    signal.textContent =
        "WAIT ⏳";

    confidence.textContent =
        "Collecting";

    strength.textContent =
        "Loading...";
}

// ==========================================
// START
// ==========================================

connect();
