// Candy AI Scanner - Live Deriv Connection

const statusEl = document.getElementById("status");
const tickEl = document.getElementById("tick");
const evenEl = document.getElementById("even");
const oddEl = document.getElementById("odd");
const signalEl = document.getElementById("signal");

let ws;
let previousPrice = null;
let evenCount = 0;
let oddCount = 0;

const APP_ID = "1089";

// Start connection
function connect() {

    setStatus("Connecting...");

    ws = new WebSocket(
        `wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`
    );

    ws.onopen = () => {

        setStatus("Connected 🟢");

        // Ask Deriv for currently active markets
        ws.send(JSON.stringify({
            active_symbols: "brief"
        }));
    };

    ws.onmessage = (event) => {

        const data = JSON.parse(event.data);

        console.log("Deriv:", data);

        // Error
        if (data.error) {

            setStatus("Error: " + data.error.message);

            console.log("Deriv error:", data.error);

            return;
        }

        // Active symbols received
        if (data.msg_type === "active_symbols") {

            const symbols = data.active_symbols || [];

            console.log("Available symbols:", symbols);

            // Look for Volatility 100 first
            let selected = symbols.find(
                s =>
                    s.underlying_symbol === "R_100" ||
                    s.symbol === "R_100"
            );

            // If R_100 isn't available, try R_50
            if (!selected) {

                selected = symbols.find(
                    s =>
                        s.underlying_symbol === "R_50" ||
                        s.symbol === "R_50"
                );
            }

            // If still not available, choose a synthetic symbol
            if (!selected) {

                selected = symbols.find(
                    s =>
                        String(
                            s.underlying_symbol || s.symbol || ""
                        ).startsWith("R_")
                );
            }

            if (!selected) {

                setStatus("No Volatility Index found");

                return;
            }

            const symbol =
                selected.underlying_symbol || selected.symbol;

            console.log("Selected market:", symbol);

            setStatus("Market: " + symbol);

            // Subscribe to live ticks
            ws.send(JSON.stringify({
                ticks: symbol,
                subscribe: 1
            }));

            return;
        }

        // Live tick received
        if (data.msg_type === "tick" && data.tick) {

            const price = Number(data.tick.quote);

            if (!Number.isFinite(price)) {
                return;
            }

            // Display price
            tickEl.textContent = price;

            // Find last digit
            const priceText = String(data.tick.quote);
            const digits = priceText.replace(/\D/g, "");

            if (!digits.length) {
                return;
            }

            const lastDigit =
                Number(digits[digits.length - 1]);

            // Even / Odd
            if (lastDigit % 2 === 0) {

                evenCount++;

            } else {

                oddCount++;
            }

            evenEl.textContent = evenCount;
            oddEl.textContent = oddCount;

            // Simple first signal
            updateSignal();

            previousPrice = price;
        }
    };

    ws.onerror = () => {

        setStatus("WebSocket Error 🔴");
    };

    ws.onclose = () => {

        setStatus("Disconnected 🔴");

        setTimeout(connect, 3000);
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


// Start
connect();
