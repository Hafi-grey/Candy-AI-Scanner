const statusEl = document.getElementById("status");
const tickEl = document.getElementById("tick");
const evenEl = document.getElementById("even");
const oddEl = document.getElementById("odd");
const signalEl = document.getElementById("signal");

let ws;
let evenCount = 0;
let oddCount = 0;
let previousPrice = null;

function setStatus(text) {
    statusEl.textContent = text;
}

function connect() {

    setStatus("Connecting...");

    ws = new WebSocket(
        "wss://ws.binaryws.com/websockets/v3"
    );

    ws.onopen = function () {

        setStatus("Connected 🟢");

        // Ask Deriv for the CURRENT available symbols
        ws.send(JSON.stringify({
            active_symbols: "brief",
            req_id: 1
        }));
    };

    ws.onmessage = function (event) {

        const data = JSON.parse(event.data);

        console.log("DERIV DATA:", data);

        if (data.error) {
            setStatus("Error: " + data.error.message);
            return;
        }

        // Receive active symbols
        if (data.msg_type === "active_symbols") {

            const symbols = data.active_symbols || [];

            console.log("TOTAL SYMBOLS:", symbols.length);

            // Show the first few symbols in console
            console.log(symbols.slice(0, 20));

            // Look for 1-second Volatility indices
            let market = symbols.find(
                item =>
                    String(item.underlying_symbol || "")
                    .includes("1HZ100V")
            );

            if (!market) {
                market = symbols.find(
                    item =>
                        String(item.underlying_symbol || "")
                        .includes("1HZ75V")
                );
            }

            if (!market) {
                market = symbols.find(
                    item =>
                        String(item.underlying_symbol || "")
                        .includes("1HZ50V")
                );
            }

            if (!market) {
                market = symbols.find(
                    item =>
                        String(item.underlying_symbol || "")
                        .includes("R_100")
                );
            }

            if (!market) {
                market = symbols.find(
                    item =>
                        String(item.underlying_symbol || "")
                        .includes("R_75")
                );
            }

            if (!market) {
                setStatus(
                    "No supported Volatility Index found"
                );

                console.log(
                    "Available symbols:",
                    symbols
                );

                return;
            }

            const symbol =
                market.underlying_symbol;

            console.log(
                "SELECTED SYMBOL:",
                symbol
            );

            setStatus(
                "Market: " + symbol + " 🟢"
            );

            // NOW subscribe using the symbol Deriv actually returned
            ws.send(JSON.stringify({
                ticks: symbol,
                subscribe: 1,
                req_id: 2
            }));

            return;
        }

        // Live tick
        if (data.msg_type === "tick") {

            const price =
                Number(data.tick.quote);

            if (!Number.isFinite(price)) {
                return;
            }

            tickEl.textContent = price;

            // Last digit
            const text =
                String(data.tick.quote);

            const digits =
                text.replace(/\D/g, "");

            if (digits.length > 0) {

                const lastDigit =
                    Number(
                        digits[digits.length - 1]
                    );

                if (lastDigit % 2 === 0) {
                    evenCount++;
                } else {
                    oddCount++;
                }

                evenEl.textContent =
                    evenCount;

                oddEl.textContent =
                    oddCount;
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
        signalEl.textContent =
            "WAITING...";
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
