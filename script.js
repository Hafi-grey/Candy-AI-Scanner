const statusEl = document.getElementById("status");
const tickEl = document.getElementById("tick");
const evenEl = document.getElementById("even");
const oddEl = document.getElementById("odd");
const signalEl = document.getElementById("signal");

let ws = null;
let evenCount = 0;
let oddCount = 0;
let previousPrice = null;

const APP_ID = "1089";

function setStatus(text) {
    statusEl.textContent = text;
}

function connect() {

    setStatus("Connecting...");

    ws = new WebSocket(
        `wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`
    );

    ws.onopen = function () {

        setStatus("Connected 🟢");

        ws.send(JSON.stringify({
            active_symbols: "brief",
            req_id: 1
        }));
    };

    ws.onmessage = function (event) {

        const data = JSON.parse(event.data);

        console.log("DERIV:", data);

        if (data.error) {
            setStatus("Error: " + data.error.message);
            return;
        }

        // Receive available markets
        if (data.msg_type === "active_symbols") {

            const markets = data.active_symbols || [];

            console.log("TOTAL MARKETS:", markets.length);

            // Find synthetic/volatility markets
            const synthetic = markets.filter(item => {

                const market =
                    String(item.market || "").toLowerCase();

                const type =
                    String(
                        item.underlying_symbol_type || ""
                    ).toLowerCase();

                return (
                    market.includes("synthetic") ||
                    type.includes("synthetic")
                );
            });

            console.log(
                "SYNTHETIC MARKETS:",
                synthetic
            );

            if (synthetic.length === 0) {

                setStatus(
                    "Connected, but no synthetic markets found"
                );

                return;
            }

            // Prefer 1-second Volatility 100
            let selected = synthetic.find(item =>
                String(item.underlying_symbol || "")
                    .includes("1HZ100V")
            );

            // Otherwise try Volatility 100
            if (!selected) {
                selected = synthetic.find(item =>
                    String(item.underlying_symbol || "")
                        .includes("R_100")
                );
            }

            // Otherwise use the first available synthetic market
            if (!selected) {
                selected = synthetic[0];
            }

            const symbol =
                selected.underlying_symbol;

            const name =
                selected.underlying_symbol_name ||
                symbol;

            console.log("SELECTED:", name, symbol);

            setStatus(
                "Market: " + name + " 🟢"
            );

            // Subscribe to the ACTUAL symbol returned by Deriv
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

            // Get final digit
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

        setStatus("WebSocket Closed 🔴");
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

        signalEl.textContent =
            "EVEN";

    } else if (oddCount > evenCount) {

        signalEl.textContent =
            "ODD";

    } else {

        signalEl.textContent =
            "WAIT";
    }
}

connect();
