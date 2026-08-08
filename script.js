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

function connect() {

    setStatus("Connecting...");

    ws = new WebSocket(
        "wss://ws.derivws.com/websockets/v3?app_id=1089"
    );

    ws.onopen = function () {

        setStatus("Connected 🟢");

        ws.send(JSON.stringify({
            ticks: SYMBOL,
            subscribe: 1
        }));

        console.log("Subscribed to:", SYMBOL);
    };

    ws.onmessage = function (event) {

        const data = JSON.parse(event.data);

        console.log(data);

        if (data.error) {

            setStatus("Error: " + data.error.message);

            return;
        }

        if (data.msg_type === "tick") {

            const price = Number(data.tick.quote);

            if (!Number.isFinite(price)) {
                return;
            }

            // Show live price
            tickEl.textContent = price;

            // Last digit
            const priceText = String(data.tick.quote);
            const digits = priceText.replace(/\D/g, "");

            if (digits.length > 0) {

                const lastDigit =
                    Number(digits[digits.length - 1]);

                // EVEN / ODD
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

                } else if (price < previousPrice) {

                    downCount++;
                }
            }

            previousPrice = price;

            updateSignal();
        }
    };

    ws.onerror = function () {

        setStatus("WebSocket Error 🔴");
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

    } else if (oddCount > evenCount) {

        signalEl.textContent = "ODD";

    } else {

        signalEl.textContent = "WAIT";
    }
}


function setStatus(message) {

    if (statusEl) {
        statusEl.textContent = message;
    }
}


connect();
