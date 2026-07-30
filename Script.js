const status = document.getElementById("status");
const tick = document.getElementById("tick");
const even = document.getElementById("even");
const odd = document.getElementById("odd");
const signal = document.getElementById("signal");

let evenCount = 0;
let oddCount = 0;

function connect() {

    status.innerHTML = "Connecting...";

    const ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=1089");

    ws.onopen = function () {

        status.innerHTML = "Connected";

        ws.send(JSON.stringify({
            ticks: "R_100"
        }));

    };

    ws.onmessage = function (msg) {

        const data = JSON.parse(msg.data);

        if (data.tick) {

            let price = data.tick.quote;

            tick.innerHTML = price;

            let lastDigit = price.toString().slice(-1);

            if (Number(lastDigit) % 2 === 0) {

                evenCount++;

                even.innerHTML = evenCount;

                signal.innerHTML = "EVEN";

                signal.style.color = "lime";

            } else {

                oddCount++;

                odd.innerHTML = oddCount;

                signal.innerHTML = "ODD";

                signal.style.color = "orange";

            }

        }

    };

    ws.onerror = function () {
        status.innerHTML = "Connection Error";
    };

    ws.onclose = function () {
        status.innerHTML = "Disconnected";
    };

}
