const status = document.getElementById("status");
const tick = document.getElementById("tick");
const even = document.getElementById("even");
const odd = document.getElementById("odd");
const signal = document.getElementById("signal");
const button = document.getElementById("connectBtn");

let evenCount = 0;
let oddCount = 0;
let ws = null;

button.addEventListener("click", function () {

    status.textContent = "Connecting...";

    ws = new WebSocket(
        "wss://ws.derivws.com/websockets/v3?app_id=1089"
    );

    ws.onopen = function () {

        status.textContent = "Connected 🟢";

        ws.send(JSON.stringify({
            ticks: "R_100",
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

            const price = data.tick.quote;

            tick.textContent = price;

            const lastDigit = String(price)
                .replace(".", "")
                .slice(-1);

            if (Number(lastDigit) % 2 === 0) {

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

    ws.onerror = function () {

        status.textContent =
            "WebSocket error 🔴";
    };

    ws.onclose = function () {

        status.textContent =
            "Disconnected 🔴";
    };

});
