const status = document.getElementById("status");
const tick = document.getElementById("tick");
const signal = document.getElementById("signal");
const confidence = document.getElementById("confidence");
const strength = document.getElementById("strength");

const ws = new WebSocket(
    "wss://ws.binaryws.com/websockets/v3"
);

status.textContent = "Connecting...";

ws.onopen = function () {
    status.textContent = "Connected 🟢";

    ws.send(JSON.stringify({
        ticks: "1HZ100V",
        subscribe: 1,
        req_id: 1
    }));
};

ws.onmessage = function (event) {

    const data = JSON.parse(event.data);

    console.log(data);

    if (data.error) {
        status.textContent = "API ERROR ❌";
        signal.textContent = data.error.message;
        return;
    }

    if (data.msg_type === "tick") {

        const price = data.tick.quote;

        tick.textContent = price;

        signal.textContent = "WAIT ⏳";
        confidence.textContent = "Collecting...";
        strength.textContent = "Receiving ticks";
    }
};

ws.onerror = function () {
    status.textContent = "WebSocket ERROR ❌";
};

ws.onclose = function () {
    status.textContent = "Connection CLOSED 🔴";
};
