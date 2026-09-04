const status = document.getElementById("status");
const tick = document.getElementById("tick");
const signal = document.getElementById("signal");
const confidence = document.getElementById("confidence");
const strength = document.getElementById("strength");

status.textContent = "Connecting...";

const ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=YOUR_APP_ID");

ws.onopen = function () {
    status.textContent = "CONNECTED 🟢";
    strength.textContent = "Sending tick request...";

    ws.send(JSON.stringify({
        ticks: "1HZ100V",
        subscribe: 1
    }));
};

ws.onmessage = function (event) {
    console.log(event.data);

    const data = JSON.parse(event.data);

    if (data.error) {
        status.textContent = "API ERROR ❌";
        signal.textContent = data.error.message;
        return;
    }

    if (data.tick) {
        status.textContent = "LIVE TICK 🟢";
        tick.textContent = data.tick.quote;
        signal.textContent = "WAIT ⏳";
        confidence.textContent = "Collecting";
        strength.textContent = "Receiving ticks";
    }
};

ws.onerror = function () {
    status.textContent = "WEBSOCKET ERROR ❌";
    strength.textContent = "Connection failed";
};

ws.onclose = function (event) {
    console.log("Closed:", event.code, event.reason);

    status.textContent = "CONNECTION CLOSED 🔴";
    strength.textContent = "Code: " + event.code;
};
