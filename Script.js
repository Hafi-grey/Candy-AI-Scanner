const status = document.getElementById("status");
const tick = document.getElementById("tick");
const even = document.getElementById("even");
const odd = document.getElementById("odd");
const signal = document.getElementById("signal");

const digitsBox = document.getElementById("digits");
const confidenceBox = document.getElementById("confidence");
const strengthBox = document.getElementById("strength");

const button = document.getElementById("connectBtn");

let ws = null;
let evenCount = 0;
let oddCount = 0;
let history = [];

const HISTORY_SIZE = 20;

button.addEventListener("click", function () {

    status.textContent = "Connecting...";

    ws = new WebSocket(
        "wss://api.derivws.com/trading/v1/options/ws/public"
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

        if (data.error) {
            status.textContent =
                "ERROR: " + data.error.message;
            return;
        }

        if (!data.tick) {
            return;
        }

        const price = data.tick.quote;

        tick.textContent = price;

        // Get last digit
        const lastDigit = Number(
            String(price)
                .replace(".", "")
                .slice(-1)
        );

        // Add digit to history
        history.push(lastDigit);

        if (history.length > HISTORY_SIZE) {
            history.shift();
        }

        // Count overall Even / Odd
        if (lastDigit % 2 === 0) {
            evenCount++;
            even.textContent = evenCount;
        } else {
            oddCount++;
            odd.textContent = oddCount;
        }

        status.textContent = "LIVE TICK 🟢";

        // Show recent digits immediately
        digitsBox.textContent = history.join(" ");

        // Wait until we have 20 digits
        if (history.length < HISTORY_SIZE) {

            signal.textContent = "Collecting...";

            confidenceBox.textContent =
                Math.round(
                    (history.length / HISTORY_SIZE) * 100
                ) + "%";

            strengthBox.textContent =
                "Collecting";

            return;
        }

        // Count Even / Odd in last 20 digits
        let recentEven = 0;
        let recentOdd = 0;

        for (let i = 0; i < history.length; i++) {

            if (history[i] % 2 === 0) {
                recentEven++;
            } else {
                recentOdd++;
            }
        }

        const evenPercent =
            (recentEven / HISTORY_SIZE) * 100;

        const oddPercent =
            (recentOdd / HISTORY_SIZE) * 100;

        // Determine signal
        if (recentEven > recentOdd) {

            signal.textContent = "EVEN";

            confidenceBox.textContent =
                Math.round(evenPercent) + "%";

        } else if (recentOdd > recentEven) {

            signal.textContent = "ODD";

            confidenceBox.textContent =
                Math.round(oddPercent) + "%";

        } else {

            signal.textContent = "WAIT";

            confidenceBox.textContent = "50%";
        }

        // Determine strength
        const difference =
            Math.abs(evenPercent - oddPercent);

        if (difference >= 30) {

            strengthBox.textContent = "STRONG";

        } else if (difference >= 20) {

            strengthBox.textContent = "MEDIUM";

        } else if (difference >= 10) {

            strengthBox.textContent = "WEAK";

        } else {

            strengthBox.textContent = "BALANCED";
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
