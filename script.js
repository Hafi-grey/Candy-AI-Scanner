const status = document.getElementById("status");
const tick = document.getElementById("tick");
const even = document.getElementById("even");
const odd = document.getElementById("odd");
const signal = document.getElementById("signal");
const connectBtn = document.getElementById("connectBtn");

let ws = null;
let evenCount = 0;
let oddCount = 0;

connectBtn.addEventListener("click", connect);

function connect() {

    if (ws && ws.readyState === WebSocket.OPEN) {
        return;
    }

    status.textContent = "Connecting...";

    ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=1089");

    ws.onopen = function () {

        status.textContent = "Connected";

        ws.send(JSON.stringify({
            ticks: "R_100",
            subscribe: 1
        }));

    };

    ws.onmessage = function (event) {

        const data = JSON.parse(event.data);

        if (!data.tick) return;

        const price = data.tick.quote;

        tick.textContent = price;

        const lastDigit = parseInt(price.toString().slice(-1));

        if (lastDigit % 2 === 0) {
            evenCount++;
            even.textContent = evenCount;
            signal.textContent = "EVEN";
            signal.style.color = "lime";
        } else {
            oddCount++;
            odd.textContent = oddCount;
            signal.textContent = "ODD";
            signal.style.color = "orange";
        }

    };

    ws.onerror = function () {
        status.textContent = "Connection Error";
    };

    ws.onclose = function () {
        status.textContent = "Disconnected";
        ws = null;
    };

          }
