const status = document.getElementById("status");
const tick = document.getElementById("tick");
const signal = document.getElementById("signal");
const confidence = document.getElementById("confidence");
const strength = document.getElementById("strength");

let prices = [];

function connect() {
    status.textContent = "Connecting...";

    const ws = new WebSocket(
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

        if (data.tick) {
            const price = Number(data.tick.quote);

            tick.textContent = price;

            prices.push(price);

            if (prices.length > 30) {
                prices.shift();
            }

            analyze();
        }

    if (data.error) {
    status.textContent = "API ERROR ❌";
    signal.textContent = data.error.message;
    console.log("DERIV ERROR:", data.error);
    }
        
        }
    };

    ws.onerror = function () {
        status.textContent = "WebSocket ERROR ❌";
    };

    ws.onclose = function () {
        status.textContent = "WebSocket CLOSED 🔴";
    };
}

function analyze() {

    if (prices.length < 10) {
        signal.textContent = "WAIT ⏳";
        confidence.textContent = prices.length + "/10 ticks";
        strength.textContent = "Collecting...";
        return;
    }

    const first = prices[0];
    const last = prices[prices.length - 1];

    const movement = last - first;

    if (movement > 0) {
        signal.textContent = "📈 RISE";
        strength.textContent = "Bullish";
    } 
    else if (movement < 0) {
        signal.textContent = "📉 FALL";
        strength.textContent = "Bearish";
    } 
    else {
        signal.textContent = "WAIT ⏳";
        strength.textContent = "Neutral";
    }

    confidence.textContent = "Testing";
}

connect();
