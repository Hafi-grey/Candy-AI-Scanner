// ==========================================
// CANDY AI - MULTI-TIMEFRAME RISE/FALL SCANNER
// ==========================================

const status = document.getElementById("status");
const tick = document.getElementById("tick");
const signal = document.getElementById("signal");
const confidence = document.getElementById("confidence");
const strength = document.getElementById("strength");

const MIN_CONFIDENCE = 60;

// Default = 1 minute
let timeframe = "1m";

let ws = null;
let symbols = [];
let selectedSymbol = null;

const marketData = {};

// ==========================================
// CONTROLS
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

    <label style="
        display:block;
        margin-top:14px;
        margin-bottom:8px;
        font-weight:bold;
    ">
        Scanner Timeframe
    </label>

    <select id="timeframeSelect"
        style="
        width:100%;
        padding:12px;
        border-radius:8px;
        font-size:16px;
        background:#111;
        color:white;
        border:1px solid #555;
        ">
        <option value="1m">1 MINUTE</option>
        <option value="5m">5 MINUTES</option>
        <option value="15m">15 MINUTES</option>
        <option value="ticks">TICKS</option>
    </select>

    <div id="marketCount"
        style="
        margin-top:10px;
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

const timeframeSelect =
    document.getElementById("timeframeSelect");

const marketCount =
    document.getElementById("marketCount");

// ==========================================
// TIMEFRAME CHANGE
// ==========================================

timeframeSelect.addEventListener(
    "change",
    function () {

        timeframe = this.value;

        resetDisplay();

        updateDisplay();
    }
);

// ==========================================
// CONNECT TO DERIV
// ==========================================

function connect() {

    status.textContent =
        "CONNECTING TO DERIV...";

    ws = new WebSocket(
        "wss://api.derivws.com/trading/v1/options/ws/public"
    );

    ws.onopen = function () {

        console.log(
            "DERIV CONNECTED"
        );

        status.textContent =
            "CONNECTED 🟢";

        marketCount.textContent =
            "Finding Volatility markets...";

        ws.send(JSON.stringify({
            active_symbols: "brief",
            req_id: 1
        }));
    };

    ws.onmessage = function(event) {

        let data;

        try {

            data = JSON.parse(
                event.data
            );

        } catch {

            return;
        }

        console.log(
            "DERIV:",
            data
        );

        // ==================================
        // API ERROR
        // ==================================

        if (data.error) {

            console.error(
                "Deriv error:",
                data.error
            );

            status.textContent =
                "API ERROR ❌";

            signal.textContent =
                data.error.message ||
                "API error";

            strength.textContent =
                "Request rejected";

            return;
        }

        // ==================================
        // ACTIVE SYMBOLS
        // ==================================

        if (
            data.msg_type === "active_symbols" &&
            Array.isArray(
                data.active_symbols
            )
        ) {

            symbols =
                data.active_symbols
                .map(item => {

                    return {

                        symbol:
                            item.underlying_symbol ||
                            item.symbol,

                        name:
                            item.underlying_symbol_name ||
                            item.display_name ||
                            item.symbol
                    };

                })
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

            // Remove duplicates
            const unique = {};

            symbols.forEach(item => {

                unique[
                    item.symbol
                ] = item;

            });

            symbols =
                Object.values(
                    unique
                );

            symbols.sort(
                (a, b) =>
                    a.name.localeCompare(
                        b.name
                    )
            );

            if (
                symbols.length === 0
            ) {

                status.textContent =
                    "NO VOLATILITY MARKETS ❌";

                return;
            }

            buildMarketList();

            // Create data containers
            symbols.forEach(item => {

                marketData[
                    item.symbol
                ] = {

                    prices: [],

                    times: [],

                    rise: 0,

                    fall: 0,

                    lastPrice: null,

                    lastTime: null,

                    ticks: 0,

                    candles: []
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
                Number(
                    data.tick.quote
                );

            const epoch =
                Number(
                    data.tick.epoch
                );

            if (
                !symbol ||
                !Number.isFinite(price)
            ) {
                return;
            }

            processTick(
                symbol,
                price,
                Number.isFinite(epoch)
                    ? epoch
                    : Date.now() / 1000
            );
        }
    };

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

    ws.onclose = function() {

        status.textContent =
            "CONNECTION CLOSED 🔴";

        strength.textContent =
            "Reconnecting...";

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

    console.log(
        "SUBSCRIBING:",
        symbol
    );

    ws.send(JSON.stringify({

        ticks: symbol,

        subscribe: 1,

        req_id:
            Math.floor(
                Math.random() *
                1000000
            )
    }));
}

// ==========================================
// MARKET LIST
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
// MARKET CHANGE
// ==========================================

marketSelect.addEventListener(
    "change",
    function () {

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
    price,
    epoch
) {

    if (!marketData[symbol]) {

        marketData[symbol] = {

            prices: [],
            times: [],
            rise: 0,
            fall: 0,
            lastPrice: null,
            lastTime: null,
            ticks: 0,
            candles: []
        };
    }

    const data =
        marketData[symbol];

    // ------------------------------
    // Tick movement
    // ------------------------------

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

    data.lastTime =
        epoch;

    data.prices.push(
        price
    );

    data.times.push(
        epoch
    );

    data.ticks++;

    // Keep tick history
    if (
        data.prices.length > 500
    ) {

        data.prices.shift();
        data.times.shift();
    }

    // Build minute candles
    buildCandle(
        data,
        price,
        epoch
    );

    if (
        symbol === selectedSymbol
    ) {

        updateDisplay();
    }
}

// ==========================================
// BUILD CANDLES FROM LIVE TICKS
// ==========================================

function buildCandle(
    data,
    price,
    epoch
) {

    // Unix minute
    const minute =
        Math.floor(
            epoch / 60
        ) * 60;

    let candle =
        data.candles[
            data.candles.length - 1
        ];

    // New minute
    if (
        !candle ||
        candle.time !== minute
    ) {

        candle = {

            time: minute,

            open: price,

            high: price,

            low: price,

            close: price
        };

        data.candles.push(
            candle
        );

    } else {

        candle.high =
            Math.max(
                candle.high,
                price
            );

        candle.low =
            Math.min(
                candle.low,
                price
            );

        candle.close =
            price;
    }

    // Keep recent candles
    if (
        data.candles.length > 60
    ) {

        data.candles.shift();
    }
}

// ==========================================
// TICK SIGNAL
// ==========================================

function calculateTickSignal(data) {

    const total =
        data.rise +
        data.fall;

    if (total < 10) {

        return {

            signal: "WAIT ⏳",

            confidence: 0,

            strength: "COLLECTING"
        };
    }

    const rise =
        (data.rise / total) *
        100;

    const fall =
        (data.fall / total) *
        100;

    return makeSignal(
        rise,
        fall
    );
}

// ==========================================
// MINUTE SIGNAL
// ==========================================

function calculateMinuteSignal(
    data,
    minutes
) {

    const required =
        minutes + 1;

    if (
        data.candles.length <
        required
    ) {

        return {

            signal: "WAIT ⏳",

            confidence: 0,

            strength:
                "COLLECTING CANDLES"
        };
    }

    // Use completed candles.
    // The current candle is excluded.
    const completed =
        data.candles.slice(
            0,
            -1
        );

    const selected =
        completed.slice(
            -minutes
        );

    if (
        selected.length < minutes
    ) {

        return {

            signal: "WAIT ⏳",

            confidence: 0,

            strength:
                "COLLECTING CANDLES"
        };
    }

    let bullish = 0;
    let bearish = 0;

    selected.forEach(
        candle => {

            if (
                candle.close >
                candle.open
            ) {

                bullish++;

            } else if (
                candle.close <
                candle.open
            ) {

                bearish++;
            }
        }
    );

    const total =
        bullish +
        bearish;

    if (total === 0) {

        return {

            signal: "WAIT ⏳",

            confidence: 50,

            strength: "WEAK"
        };
    }

    const rise =
        (bullish / total) *
        100;

    const fall =
        (bearish / total) *
        100;

    return makeSignal(
        rise,
        fall
    );
}

// ==========================================
// SIGNAL ENGINE
// ==========================================

function makeSignal(
    rise,
    fall
) {

    const confidence =
        Math.round(
            Math.max(
                rise,
                fall
            )
        );

    let signal =
        "WAIT ⏳";

    let strength =
        "WEAK";

    if (
        rise >= 75 &&
        rise > fall
    ) {

        signal =
            "⬆️ STRONG RISE";

        strength =
            "STRONG";

    } else if (
        fall >= 75 &&
        fall > rise
    ) {

        signal =
            "⬇️ STRONG FALL";

        strength =
            "STRONG";

    } else if (
        rise >= 65 &&
        rise > fall
    ) {

        signal =
            "⬆️ RISE";

        strength =
            "MEDIUM";

    } else if (
        fall >= 65 &&
        fall > rise
    ) {

        signal =
            "⬇️ FALL";

        strength =
            "MEDIUM";

    } else if (
        rise >= MIN_CONFIDENCE &&
        rise > fall
    ) {

        signal =
            "⬆️ WATCH RISE";

        strength =
            "WEAK";

    } else if (
        fall >= MIN_CONFIDENCE &&
        fall > rise
    ) {

        signal =
            "⬇️ WATCH FALL";

        strength =
            "WEAK";
    }

    return {

        signal,

        confidence,

        strength
    };
}

// ==========================================
// DISPLAY
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

        resetDisplay();

        return;
    }

    tick.textContent =
        data.lastPrice;

    let result;

    // ======================================
    // TICKS MODE
    // ======================================

    if (
        timeframe === "ticks"
    ) {

        result =
            calculateTickSignal(
                data
            );

        confidence.textContent =
            result.confidence
                ? result.confidence + "%"
                : "Collecting";

        signal.textContent =
            result.signal;

        strength.textContent =
            result.strength +
            " | Rise: " +
            data.rise +
            " | Fall: " +
            data.fall +
            " | Ticks: " +
            data.ticks;

        return;
    }

    // ======================================
    // MINUTE MODES
    // ======================================

    let minutes = 1;

    if (
        timeframe === "5m"
    ) {
        minutes = 5;
    }

    if (
        timeframe === "15m"
    ) {
        minutes = 15;
    }

    result =
        calculateMinuteSignal(
            data,
            minutes
        );

    signal.textContent =
        result.signal;

    confidence.textContent =
        result.confidence
            ? result.confidence + "%"
            : "Collecting";

    strength.textContent =
        result.strength +
        " | " +
        timeframe.toUpperCase() +
        " | Candles: " +
        data.candles.length;
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
        "Collecting market data...";
}

// ==========================================
// START
// ==========================================

timeframeSelect.value =
    "1m";

connect();
