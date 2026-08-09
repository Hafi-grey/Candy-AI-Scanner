const status = document.getElementById("status");
const tick = document.getElementById("tick");
const even = document.getElementById("even");
const odd = document.getElementById("odd");
const signal = document.getElementById("signal");
const button = document.getElementById("connectBtn");

let ws;
let evenCount = 0;
let oddCount = 0;

button.addEventListener("click", () => {

    status.textContent = "Connecting...";

    ws = new WebSocket(
        "wss://api.derivws.com/trading/v1/options/ws/public"
    );

    ws.onopen = () => {

        status.textContent = "Connected 🟢";

        ws.send(JSON.stringify({
            ticks: "R_100",
            subscribe: 1
        }));
    };

    ws.onmessage = (event) => {

        const data = JSON.parse(event.data);

        console.log(data);

        if (data.error) {
            status.textContent = "ERROR: " + data.error.message;
            return;
        }

        if (data.tick) {

            const price = data.tick.quote;

            tick.textContent = price;

            const digits = String(price).replace(".", "");
            const lastDigit = Number(digits.slice(-1));

            if (lastDigit % 2 === 0) {
                evenCount++;
                even.textContent = evenCount;
            } else {
                oddCount++;
                odd.textContent = oddCount;
            }

            status.textContent = "LIVE TICK 🟢";
            signal.textContent = "Scanning...";
        }
    };

    ws.onerror = () => {
        status.textContent = "WebSocket error 🔴";
    };

    ws.onclose = () => {
        status.textContent = "Disconnected 🔴";
    };

});
