const status = document.getElementById("status");

status.textContent = "Testing connection...";

const ws = new WebSocket(
    "wss://ws.derivws.com/websockets/v3?app_id=1089"
);

ws.onopen = function () {
    status.textContent = "DERIV CONNECTION WORKS 🟢";
};

ws.onerror = function () {
    status.textContent = "DERIV CONNECTION FAILED 🔴";
};

ws.onclose = function () {
    console.log("WebSocket closed");
};
