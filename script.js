const status = document.getElementById("status");
const tick = document.getElementById("tick");
const even = document.getElementById("even");
const odd = document.getElementById("odd");
const signal = document.getElementById("signal");
const button = document.getElementById("connectBtn");

let ws;
let evenCount = 0;
let oddCount = 0;
let digitHistory = [];

const HISTORY_SIZE = 20;

button.addEventListener("click", () => {

    if (ws && ws.readyState === WebSocket.OPEN) {
        return;
    }

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

        // Save digit
        digitHistory.push(lastDigit);

        if (digitHistory.length > HISTORY_SIZE) {
            digitHistory.shift();
        }

        // Overall counters
        if (lastDigit % 2 === 0) {
            evenCount++;
            even.textContent = evenCount;
        } else {
            oddCount++;
            odd.textContent = oddCount;
        }

        status.textContent = "LIVE TICK 🟢";

        // Wait until 20 digits are collected
        if (digitHistory.length < HISTORY_SIZE) {

            signal.textContent =
                "Collecting " +
                digitHistory.length +
                "/20";

            return;
        }

        // Analyse last 20 digits
        let recentEven = 0;
        let recentOdd = 0;

        digitHistory.forEach((digit) => {

            if (digit % 2 === 0) {
                recentEven++;
            } else {
                recentOdd++;
            }

        });

        const evenPercent =
            (recentEven / HISTORY_SIZE) * 100;

        const oddPercent =
            (recentOdd / HISTORY_SIZE) * 100;

        // Difference between Even and Odd
        const difference =
            Math.abs(evenPercent - oddPercent);

        let result;

        if (recentEven > recentOdd) {

            result =
                "EVEN • " +
                evenPercent.toFixed(0) +
                "%";

        } else if (recentOdd > recentEven) {

            result =
                "ODD • " +
                oddPercent.toFixed(0) +
                "%";

        } else {

            result = "WAIT • 50/50";
        }

        // Strength
        let strength;

        if (difference >= 30) {
            strength = "STRONG";
        } else if (difference >= 20) {
            strength = "MEDIUM";
        } else if (difference >= 10) {
            strength = "WEAK";
        } else {
            strength = "BALANCED";
        }

        signal.textContent =
            result +
            " • " +
            strength;
    };

    ws.onerror = () => {

        status.textContent =
            "WebSocket error 🔴";
    };

    ws.onclose = () => {

        status.textContent =
            "Disconnected 🔴";
    };
});
