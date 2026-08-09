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

const MAX_HISTORY = 20;

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

        // Get the last digit of the price
        const lastDigit = Number(
            String(price)
                .replace(".", "")
                .slice(-1)
        );

        // Store digit
        digitHistory.push(lastDigit);

        if (digitHistory.length > MAX_HISTORY) {
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

        // Need enough data before giving a signal
        if (digitHistory.length < 10) {

            signal.textContent =
                "Collecting data... " +
                digitHistory.length +
                "/10";

            return;
        }

        // Analyse the last 10 digits
        const recentDigits =
            digitHistory.slice(-10);

        let recentEven = 0;
        let recentOdd = 0;

        recentDigits.forEach((digit) => {

            if (digit % 2 === 0) {
                recentEven++;
            } else {
                recentOdd++;
            }

        });

        const total = recentEven + recentOdd;

        const evenProbability =
            (recentEven / total) * 100;

        const oddProbability =
            (recentOdd / total) * 100;

        // Only signal when there is a difference
        if (recentEven > recentOdd) {

            signal.textContent =
                "EVEN • " +
                evenProbability.toFixed(0) +
                "%";

        } else if (recentOdd > recentEven) {

            signal.textContent =
                "ODD • " +
                oddProbability.toFixed(0) +
                "%";

        } else {

            signal.textContent =
                "WAIT • 50/50";
        }
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
