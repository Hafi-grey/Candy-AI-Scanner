// Candy AI Scanner - Version 1
// Live Deriv tick scanner

const statusEl = document.getElementById("status");
const tickEl = document.getElementById("tick");
const evenEl = document.getElementById("even");
const oddEl = document.getElementById("odd");
const signalEl = document.getElementById("signal");

let ws;
let previousPrice = null;

let evenCount = 0;
let oddCount = 0;
let overCount = 0;
let underCount = 0;
let upCount = 0;
let downCount = 0;

// Deriv market
const SYMBOL = "R_100";
const APP_ID = "1089";

function setStatus(message) {
    if (statusEl) {
        statusEl.textContent = message;
    }
}

function connect() {

    setStatus("Connecting...");

    ws = new WebSocket(
        `wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`
    );

    ws.onopen = function () {

        setStatus("Connected 🟢");

        // Subscribe to live R_100 ticks
        ws.send(JSON.stringify({
            ticks: SYMBOL,
            subscribe: 1
        }));
    };

    ws.onmessage = function (event) {

        try {

            const data = JSON.parse(event.data);

            if (data.error) {
                console.log("Deriv error:", data.error.message);
                setStatus("Error: " + data.error.message);
                return;
            }

            if (data.tick) {

                const price = Number(data.tick.quote);

                if (!Number.isFinite(price)) {
                    return;
                }

                // Display live price
                if (tickEl) {
                    tickEl.textContent = price;
                }

                // Get last digit
                const priceString = String(data.tick.quote);
                const digitsOnly = priceString.replace(/\D/g, "");
                const lastDigit =
                    Number(digitsOnly.charAt(digitsOnly.length - 1));

                // EVEN / ODD
                if (lastDigit % 2 === 0) {
                    evenCount++;
                } else {
                    oddCount++;
                }

                if (evenEl) {
                    evenEl.textContent = evenCount;
                }

                if (oddEl) {
                    oddEl.textContent = oddCount;
                }

                // OVER / UNDER 5
                if (lastDigit > 5) {
                    overCount++;
                } else {
                    underCount++;
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

                // Basic scanner signal
                updateSignal();
            }

        } catch (error) {
            console.log("Message error:", error);
        }
    };

    ws.onerror = function () {
        setStatus("Connection error 🔴");
    };

    ws.onclose = function () {

        setStatus("Disconnected 🔴");

        // Try reconnecting after 3 seconds
        setTimeout(connect, 3000);
    };
}


function updateSignal() {

    const totalDigits = evenCount + oddCount;

    if (totalDigits < 5) {

        if (signalEl) {
            signalEl.textContent = "WAITING...";
        }

        return;
    }

    const totalDirection = upCount + downCount;

    let signal = "WAIT";

    // Digit signal
    if (overCount > underCount) {
        signal = "OVER";
    } else if (underCount > overCount) {
        signal = "UNDER";
    }

    // Direction signal
    if (totalDirection >= 5) {

        if (upCount > downCount) {
            signal += " / UP";
        } else if (downCount > upCount) {
            signal += " / DOWN";
        }
    }

    if (signalEl) {
        signalEl.textContent = signal;
    }
}


// Start scanner
connect();
