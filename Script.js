const status = document.getElementById("status");
const tick = document.getElementById("tick");
const signal = document.getElementById("signal");
const confidence = document.getElementById("confidence");
const strength = document.getElementById("strength");

let prices = [];
let ws;

// Deriv synthetic index
const SYMBOL = "R_100";

function connect() {
    status.textContent = "Connecting...";

    ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=1089");

    ws.onopen = function () {
        status.textContent = "Connected 🟢";

        ws.send(JSON.stringify({
            ticks: SYMBOL,
            subscribe: 1
        }));
    };

    ws.onmessage = function (event) {
        const data = JSON.parse(event.data);

        if (data.tick) {
            const price = Number(data.tick.quote);

            tick.textContent = price.toFixed(2);

            prices.push(price);

            if (prices.length > 30) {
                prices.shift();
            }

            analyze();
        }

        if (data.error) {
            status.textContent = "API Error ❌";
            console.log(data.error);
        }
    };

    ws.onerror = function () {
        status.textContent = "Connection Error ❌";
    };

    ws.onclose = function () {
        status.textContent = "Disconnected 🔴";
    };
}

function analyze() {
    if (prices.length < 10) {
        signal.textContent = "WAIT ⏳";
        confidence.textContent = "Waiting...";
        strength.textContent = "Collecting data...";
        return;
    }

    const recent = prices.slice(-10);
    const old = prices.slice(-20, -10);

    const recentAverage =
        recent.reduce((a, b) => a + b, 0) / recent.length;

    const oldAverage =
        old.reduce((a, b) => a + b, 0) / old.length;

    const difference = recentAverage - oldAverage;

    let confidenceValue = Math.min(
        95,
        Math.round(50 + Math.abs(difference) * 100)
    );

    if (difference > 0) {
        signal.textContent = "📈 RISE";
        strength.textContent = "Bullish";
    } else if (difference < 0) {
        signal.textContent = "📉 FALL";
        strength.textContent = "Bearish";
    } else {
        signal.textContent = "WAIT ⏳";
        strength.textContent = "Neutral";
    }

    confidence.textContent = confidenceValue + "%";
}

connect();
