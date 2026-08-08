const statusEl = document.getElementById("status");
const tickEl = document.getElementById("tick");
const evenEl = document.getElementById("even");
const oddEl = document.getElementById("odd");
const signalEl = document.getElementById("signal");

let ws = null;

let evenCount = 0;
let oddCount = 0;
let upCount = 0;
let downCount = 0;

let previousPrice = null;

const SYMBOL = "1HZ100V";

function setStatus(message) {
    statusEl.textContent = message;
}

function connect() {

    setStatus("Connecting...");

    // Current public Deriv market-data endpoint
    ws = new WebSocket(
        "wss://ws.binaryws.com/websockets/v3"
    );

    ws.onopen = function () {

        setStatus("Connected 🟢");

        // Ask Deriv for available markets
        ws.send(JSON.stringify({
            active_symbols: "brief",
            product_type: "basic",
            req_id: 1
        }));

        // Subscribe to Volatility 100 1s
        ws.send(JSON.stringify({
            ticks: SYMBOL,
            subscribe: 1,
            req_id: 2
        }));
    };

    ws.onmessage = function (event) {

        const data = JSON.parse(event.data);

        console.log("DERIV:", data);

        if (data.error) {
            setStatus("Error: " + data.error.message);
            return;
        }

        // Show that the market exists
        if (data.msg_type === "active_symbols") {

            const found = data.active_symbols.some(
                item => item.symbol === SYMBOL
            );

            if (found) {
                setStatus("Market found 🟢");
            } else {
                setStatus("Market not available");
            }
        }

        // Live tick
        if (data.msg_type === "tick") {

            const price = Number(data.tick.quote);

            if (!Number.isFinite(price)) {
                return;
            }

            // Display price
            tickEl.textContent = price;

            // Get last digit
            const priceText = String(data.tick.quote);
            const digits = priceText.replace(/\D/g, "");

            if (digits.length > 0) {

                const lastDigit =
                    Number(digits[digits.length - 1]);

                if (lastDigit % 2 === 0) {
                    evenCount++;
                } else {
                    oddCount++;
                }

                evenEl.textContent = evenCount;
                oddEl.textContent = oddCount;
            }

            // UP / DOWN
            if (previousPrice !== null) {

                if (price > previousPrice) {
                    upCount++;
                }

                if (price < previousPrice) {
                    downCount++;
                }
            }

            previousPrice = price;

            updateSignal();
        }
    };

    ws.onerror = function () {
        setStatus("WebSocket error 🔴");
    };

    ws.onclose = function () {
        setStatus("Disconnected 🔴");
    };
}

function updateSignal() {

    const total =
        evenCount + oddCount;

    if (total < 10) {
        signalEl.textContent = "WAITING...";
        return;
    }

    if (evenCount > oddCount) {
        signalEl.textContent = "EVEN";
    }
    else if (oddCount > evenCount) {
        signalEl.textContent = "ODD";
    }
    else {
        signalEl.textContent = "WAIT";
    }
}

connect();
