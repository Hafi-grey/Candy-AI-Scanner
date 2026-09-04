const status = document.getElementById("status");
const tick = document.getElementById("tick");
const signal = document.getElementById("signal");
const confidence = document.getElementById("confidence");
const strength = document.getElementById("strength");

status.textContent = "Connecting...";

const ws = new WebSocket(
    "wss://api.derivws.com/trading/v1/options/ws/public"
);
ws.send(JSON.stringify({
  ticks: "1HZ100V",
  subscribe: 1,
  req_id: 1
}));
ws.onopen = function () {
    console.log("CONNECTED");

    status.textContent = "Connected 🟢";
    strength.textContent = "Requesting market data...";

    // Request a live tick stream
    ws.send(JSON.stringify({
        ticks: "1HZ100V",
        subscribe: 1
    }));
};

ws.onmessage = function (event) {
    console.log("DERIV:", event.data);

    const data = JSON.parse(event.data);

    if (data.error) {
        status.textContent = "API ERROR ❌";
        signal.textContent = data.error.message || "API error";
        strength.textContent = "Request rejected";
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

ws.onerror = function (event) {
    console.log("WebSocket error:", event);

    status.textContent = "WEBSOCKET ERROR ❌";
    strength.textContent = "Connection failed";
};

ws.onclose = function (event) {
    console.log("Closed:", event.code, event.reason);

    status.textContent = "CONNECTION CLOSED 🔴";
    strength.textContent = "Code: " + event.code;
};
