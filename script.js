const status = document.getElementById("status");
const tick = document.getElementById("tick");

status.textContent = "Connecting...";

const ws = new WebSocket(
    "wss://ws.derivws.com/websockets/v3?app_id=1089"
);

ws.onopen = function () {

    status.textContent = "Connected 🟢";

    ws.send(JSON.stringify({
        ticks: "R_100"
        subscribe: 1
    }));
};

ws.onmessage = function (event) {

    const data = JSON.parse(event.data);

    console.log(data);

    if (data.error) {
        status.textContent =
            "ERROR: " + data.error.message;
        return;
    }

    if (data.tick) {

        status.textContent =
            "LIVE TICK 🟢";

        tick.textContent =
            data.tick.quote;
    }
};

ws.onerror = function () {
    status.textContent =
        "WebSocket error 🔴";
};

ws.onclose = function () {
    console.log("Connection closed");
};
