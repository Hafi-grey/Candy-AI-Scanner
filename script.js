const statusEl = document.getElementById("status");
const tickEl = document.getElementById("tick");
const evenEl = document.getElementById("even");
const oddEl = document.getElementById("odd");
const signalEl = document.getElementById("signal");

const ws = new WebSocket(
    "wss://ws.binaryws.com/websockets/v3"
);

function status(text) {
    statusEl.textContent = text;
}

ws.onopen = function () {

    status("Connected 🟢");

    ws.send(JSON.stringify({
        active_symbols: "brief",
        req_id: 100
    }));
};

ws.onmessage = function (event) {

    const data = JSON.parse(event.data);

    console.log("DERIV RESPONSE:", data);

    if (data.error) {

        status("ERROR: " + data.error.message);

        return;
    }

    if (data.msg_type === "active_symbols") {

        const symbols = data.active_symbols || [];

        console.log("TOTAL MARKETS:", symbols.length);

        // Find all Volatility/Synthetic markets
        const volatility = symbols.filter(item => {

            const text = JSON.stringify(item).toLowerCase();

            return (
                text.includes("volatility") ||
                text.includes("synthetic")
            );
        });

        console.log(
            "VOLATILITY MARKETS:",
            volatility
        );

        if (volatility.length === 0) {

            status(
                "No Volatility markets returned"
            );

            return;
        }

        // Show the first available market
        const first = volatility[0];

        const symbol =
            first.underlying_symbol ||
            first.symbol;

        const name =
            first.underlying_symbol_name ||
            first.display_name ||
            "Unknown";

        status(
            "FOUND: " + name + " (" + symbol + ")"
        );

        console.log(
            "USE THIS SYMBOL:",
            symbol
        );

        // Put the discovered symbol in Last Tick
        tickEl.textContent = symbol;
    }
};

ws.onerror = function () {
    status("WebSocket Error 🔴");
};

ws.onclose = function () {
    console.log("Connection closed");
};
