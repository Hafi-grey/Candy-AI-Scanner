document.addEventListener("DOMContentLoaded", () => {

    const button = document.getElementById("connectBtn");
    const status = document.getElementById("status");
    const tick = document.getElementById("tick");
    const even = document.getElementById("even");
    const odd = document.getElementById("odd");
    const signal = document.getElementById("signal");

    let evenCount = 0;
    let oddCount = 0;

    button.addEventListener("click", () => {

        status.innerHTML = "Connecting...";

        const ws = new WebSocket(
            "wss://ws.derivws.com/websockets/v3?app_id=1089"
        );

        ws.onopen = () => {
            status.innerHTML = "Connected";

            ws.send(JSON.stringify({
    ticks: "R_100",
    subscribe: 1
}));
        };

        ws.onmessage = (msg) => {

            const data = JSON.parse(msg.data);

            if (data.tick) {

                const lastDigit = data.tick.quote
                    .toString()
                    .slice(-1);

                tick.innerHTML = lastDigit;

                if (Number(lastDigit) % 2 === 0) {
                    evenCount++;
                    even.innerHTML = evenCount;
                } else {
                    oddCount++;
                    odd.innerHTML = oddCount;
                }

                signal.innerHTML = "Scanning...";
            }
        };

        ws.onclose = () => {
            status.innerHTML = "Disconnected";
        };

        ws.onerror = () => {
            status.innerHTML = "Error";
        };

    });

});
