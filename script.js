const status = document.getElementById("status");
const tick = document.getElementById("tick");
const signal = document.getElementById("signal");
const confidence = document.getElementById("confidence");
const strength = document.getElementById("strength");

status.textContent = "Starting connection...";

let ws;

try {
    ws = new WebSocket("wss://ws.binaryws.com/websockets/v3");

    // If nothing happens after 10 seconds
    const timeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
            status.textContent = "Connection TIMEOUT ❌";
            signal.textContent = "WebSocket did not connect";
            confidence.textContent = "Check connection";
            strength.textContent = "Timeout";
            ws.close();
        }
    }, 10000);

    ws.onopen = function () {
        clearTimeout(timeout);

        status.textContent = "Connected 🟢";
        signal.textContent = "Getting market...";
        strength.textContent = "Connected";

        // Ask Deriv for available markets
        ws.send(JSON.stringify({
            active_symbols: "brief",
            product_type: "basic",
            req_id: 1
        }));

        // Subscribe to live ticks
        ws.send(JSON.stringify({
            ticks: "1HZ100V",
            subscribe: 1,
            req_id: 2
        }));
    };

    ws.onmessage = function (event) {
        const data = JSON.parse(event.data);

        console.log("DERIV:", data);

        if (data.error) {
            status.textContent = "API ERROR ❌";
            signal.textContent = data.error.message;
            return;
        }

        if (data.msg_type === "tick") {
            status.textContent = "LIVE TICK 🟢";

            tick.textContent = data.tick.quote;

            signal.textContent = "WAIT ⏳";
            confidence.textContent = "Collecting";
            strength.textContent = "Receiving ticks";
        }

        if (data.msg_type === "active_symbols") {
            strength.textContent = "Market data ready";
        }
    };

    ws.onerror = function () {
        clearTimeout(timeout);

        status.textContent = "WebSocket ERROR ❌";
        signal.textContent = "Connection failed";
        confidence.textContent = "0%";
        strength.textContent = "Check network";
    };

    ws.onclose = function () {
        if (status.textContent !== "LIVE TICK 🟢") {
            status.textContent = "WebSocket CLOSED 🔴";
        }
    };

} catch (error) {
    status.textContent = "JavaScript ERROR ❌";
    signal.textContent = error.message;
}
