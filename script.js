const statusEl = document.getElementById("status");
const tickEl = document.getElementById("tick");
const evenEl = document.getElementById("even");
const oddEl = document.getElementById("odd");
const signalEl = document.getElementById("signal");

statusEl.textContent = "Starting scanner...";

const ws = new WebSocket(
    "wss://ws.binaryws.com/websockets/v3"
);

ws.onopen = function () {

    statusEl.textContent = "CONNECTED 🟢";

    ws.send(JSON.stringify({
        active_symbols: "brief",
        req_id: 1
    }));
};

ws.onmessage = function (event) {

    const data = JSON.parse(event.data);

    console.log(data);

    if (data.error) {
        statusEl.textContent =
            "DERIV ERROR: " + data.error.message;
        return;
    }

    if (data.msg_type === "active_symbols") {

        const markets = data.active_symbols || [];

        console.log("MARKETS:", markets);

        if (markets.length === 0) {
            statusEl.textContent =
                "Connected, but 0 markets returned";
            return;
        }

        // Find a Volatility Index using the CURRENT field name
        const volatility = markets.filter(item => {

            const type =
                String(
                    item.underlying_symbol_type || ""
                ).toLowerCase();

            const name =
                String(
                    item.underlying_symbol_name || ""
                ).toLowerCase();

            return (
                type.includes("volatility") ||
                name.includes("volatility")
            );
        });

        if (volatility.length > 0) {

            const market = volatility[0];

            const symbol =
                market.underlying_symbol;

            const name =
                market.underlying_symbol_name;

            statusEl.textContent =
                "FOUND 🟢 " + name;

            tickEl.textContent =
                symbol;

            console.log(
                "VOLATILITY SYMBOL:",
                symbol
            );

            // Subscribe using the symbol returned by Deriv
            ws.send(JSON.stringify({
                ticks: symbol,
                subscribe: 1,
                req_id: 2
            }));

        } else {

            statusEl.textContent =
                "Connected 🟢 — No Volatility found";

            console.log(
                "First markets:",
                markets.slice(0, 10)
            );
        }
    }

    if (data.msg_type === "tick") {

        const price =
            Number(data.tick.quote);

        tickEl.textContent = price;

        statusEl.textContent =
            "LIVE TICK 🟢";

        const text =
            String(data.tick.quote);

        const digits =
            text.replace(/\D/g, "");

        if (digits.length > 0) {

            const last =
                Number(
                    digits[digits.length - 1]
                );

            if (last % 2 === 0) {

                evenEl.textContent =
                    Number(evenEl.textContent) + 1;

            } else {

                oddEl.textContent =
                    Number(oddEl.textContent) + 1;
            }
        }

        signalEl.textContent =
            "RECEIVING DATA...";
    }
};

ws.onerror = function () {

    statusEl.textContent =
        "WebSocket ERROR 🔴";
};

ws.onclose = function () {

    statusEl.textContent =
        "WebSocket CLOSED 🔴";
};
