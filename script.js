const status = document.getElementById("status");
const tick = document.getElementById("tick");
const signal = document.getElementById("signal");
const confidence = document.getElementById("confidence");
const strength = document.getElementById("strength");

let ws;
let reconnectTimer;

function connect() {

    clearTimeout(reconnectTimer);

    status.textContent = "Connecting... 🔄";
    signal.textContent = "Waiting...";
    confidence.textContent = "0%";
    strength.textContent = "Connecting";

    ws = new WebSocket(
        "wss://ws.binaryws.com/websockets/v3"
    );

    ws.onopen = function () {

        console.log("CONNECTED TO DERIV");

        status.textContent = "Connected 🟢";
        strength.textContent = "Requesting market...";

        // Request active markets
        ws.send(JSON.stringify({
            active_symbols: "brief",
            product_type: "basic",
            req_id: 1
        }));

        // Subscribe to 1HZ100V
        ws.send(JSON.stringify({
            ticks: "1HZ100V",
            subscribe: 1,
            req_id: 2
        }));
    };


    ws.onmessage = function (event) {

        console.log("DERIV MESSAGE:", event.data);

        let data;

        try {
            data = JSON.parse(event.data);
        } catch (error) {
            console.log("JSON ERROR:", error);
            return;
        }

        // Show API error
        if (data.error) {

            console.error("DERIV API ERROR:", data.error);

            status.textContent = "API ERROR ❌";
            signal.textContent =
                data.error.message || "Unknown API error";

            confidence.textContent = "0%";
            strength.textContent = "Request failed";

            return;
        }


        // Active symbols received
        if (data.msg_type === "active_symbols") {

            console.log(
                "ACTIVE SYMBOLS RECEIVED:",
                data.active_symbols
            );

            strength.textContent = "Market data ready";
        }


        // LIVE TICK
        if (data.msg_type === "tick") {

            console.log(
                "LIVE TICK:",
                data.tick.quote
            );

            status.textContent = "LIVE TICK 🟢";

            tick.textContent = data.tick.quote;

            signal.textContent = "WAIT ⏳";
            confidence.textContent = "Collecting";
            strength.textContent = "Receiving ticks";
        }
    };


    ws.onerror = function (error) {

        console.error("WEBSOCKET ERROR:", error);

        status.textContent = "WebSocket ERROR ❌";
        signal.textContent = "Connection error";
        confidence.textContent = "0%";
        strength.textContent = "See console";
    };


    ws.onclose = function (event) {

        console.log(
            "WEBSOCKET CLOSED",
            "Code:",
            event.code,
            "Reason:",
            event.reason
        );

        status.textContent =
            "Connection closed 🔴";

        signal.textContent =
            "Reconnecting...";

        strength.textContent =
            "Waiting for connection";

        // Try again after 3 seconds
        reconnectTimer = setTimeout(
            connect,
            3000
        );
    };
}


// START
connect();
