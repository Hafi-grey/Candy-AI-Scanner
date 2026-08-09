const status = document.getElementById("status");
const tick = document.getElementById("tick");
const even = document.getElementById("even");
const odd = document.getElementById("odd");
const signal = document.getElementById("signal");

const digits = document.getElementById("digits");
const confidence = document.getElementById("confidence");
const strength = document.getElementById("strength");

const button = document.getElementById("connectBtn");

let ws = null;
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

        // Get the final digit of the quote
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

        // Count Even / Odd
        if (lastDigit % 2 === 0) {

            evenCount++;
            even.textContent = evenCount;

        } else {

            oddCount++;
            odd.textContent = oddCount;
        }

        status.textContent = "LIVE TICK 🟢";

        // Show recent digits
        digits.textContent =
            digitHistory.join(" ");

        // Wait for enough data
        if (digitHistory.length < HISTORY_SIZE) {

            signal.textContent =
                "Collecting...";

            confidence.textContent =
                "0%";

            strength.textContent =
                "Waiting";

            return;
        }

        // Analyse the last 20 digits
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

        let selectedSignal;
        let selectedConfidence;

        if (recentEven > recentOdd) {

            selectedSignal = "EVEN";
            selectedConfidence = evenPercent;

        } else if (recentOdd > recentEven) {

            selectedSignal = "ODD";
            selectedConfidence = oddPercent;

        } else {

            selectedSignal = "WAIT";
            selectedConfidence = 50;
        }

        const difference =
            Math.abs(evenPercent - oddPercent);

        let selectedStrength;

        if (difference >= 30) {
            selectedStrength = "STRONG";
        } else if (difference >= 20) {
            selectedStrength = "MEDIUM";
        } else if (difference >= 10) {
            selectedStrength = "WEAK";
        } else {
            selectedStrength = "BALANCED";
        }

        signal.textContent =
            selectedSignal;

        confidence.textContent =
            selectedConfidence.toFixed(0) + "%";

        strength.textContent =
            selectedStrength;
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
