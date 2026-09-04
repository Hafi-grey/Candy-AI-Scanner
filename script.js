const status = document.getElementById("status");
const tick = document.getElementById("tick");
const signal = document.getElementById("signal");
const confidence = document.getElementById("confidence");
const strength = document.getElementById("strength");

const APP_ID = "34j74jco1hp5SDjVzKDxT";

status.textContent = "Connecting...";

const url =
    "wss://ws.derivws.com/websockets/v3?app_id=" + APP_ID;

console.log("Connecting to:", url);

const ws = new WebSocket(url);

ws.onopen = () => {
    console.log("OPEN");

    status.textContent = "Connected 🟢";
    strength.textContent = "Requesting tick...";

    ws.send(JSON.stringify({
        ticks: "1HZ100V",
        subscribe: 1
    }));
};

ws.onmessage = (event) => {

    console.log("MESSAGE:", event.data);

    const data = JSON.parse(event.data);

    if (data.error) {
        status.textContent = "API ERROR ❌";
        signal.textContent = data.error.message;
        strength.textContent = "Deriv rejected request";
        return;
    }

    if (data.msg_type === "tick") {
        status.textContent = "LIVE TICK 🟢";
        tick.textContent = data.tick.quote;
        signal.textContent = "WAIT ⏳";
        confidence.textContent = "Collecting";
        strength.textContent = "Receiving ticks";
    }
};

ws.onerror = (event) => {
    console.log("ERROR:", event);
    status.textContent = "WEBSOCKET ERROR ❌";
    strength.textContent = "Browser/network error";
};

ws.onclose = (event) => {
    console.log("CLOSED");
    console.log("Code:", event.code);
    console.log("Reason:", event.reason);

    status.textContent = "CLOSED 🔴";
    strength.textContent = "Code " + event.code;
};
