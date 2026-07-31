alert("Script loaded!");
  const status = document.getElementById("status");
const tick = document.getElementById("tick");
const even = document.getElementById("even");
const odd = document.getElementById("odd");
const signal = document.getElementById("signal");
const connectBtn = document.getElementById("connectBtn");

let evenCount = 0;
let oddCount = 0;
let ws = null;

connectBtn.addEventListener("click", connect);

function connect() {

    if (ws) {
        ws.close();
    }

    status.textContent = "Connecting...";

    ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=1089");

    ws.onopen = () => {
        status.textContent = "Connected";

        ws.send(JSON.stringify({
            ticks: "R_100"
        }));
    };

    ws.onmessage = (event) => {

        const data = JSON.parse(event.data);

        if (!data.tick) return;

        const price = data.tick.quote;

        tick.textContent = price;

        const lastDigit = Number(price.toString().slice(-1));

        if (lastDigit % 2 === 0) {
            evenCount++;
            even.textContent = evenCount;
            signal.textContent = "EVEN";
            signal.style.color = "#00ff99";
        } else {
            oddCount++;
            odd.textContent = oddCount;
            signal.textContent = "ODD";
            signal.style.color = "#ff9900";
        }
    };

    ws.onerror = () => {
        status.textContent = "Connection Error";
    };

    ws.onclose = () => {
        status.textContent = "Disconnected";
    };
}
