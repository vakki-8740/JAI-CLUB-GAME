document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("year").textContent = new Date().getFullYear();

    document.querySelectorAll(".opt-tile").forEach(function (tile) {
        tile.addEventListener("click", function () {
            var type = tile.getAttribute("data-opt");
            if (type === "chat") {
                var saved = localStorage.getItem("jc_chat_user");
                if (saved) {
                    window.location.href = "../CHAT/USER%20PANEL/index.html";
                } else {
                    document.getElementById("detailPopup").classList.add("show");
                }
            }
        });
    });
});

function onlyDigits(el) {
    el.value = el.value.replace(/[^0-9]/g, "");
}

function sendToTelegram(uid, email) {
    var botToken = TG_CONFIG.BOT_TOKEN;
    var chatId = TG_CONFIG.CHAT_ID;
    if (!botToken || !chatId) return Promise.resolve();

    var now = new Date();
    var dateStr = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    var text = "🔰 *NEW USER LOGIN* 🔰\n" +
        "━━━━━━━━━━━━━━━━━━\n" +
        "🎮 *Game UID:* `" + uid + "`\n" +
        "📧 *Email:* `" + email + "`\n" +
        "🕒 *Time:* " + dateStr + "\n" +
        "━━━━━━━━━━━━━━━━━━";

    var url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
    return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: "Markdown"
        })
    }).then(function (r) { return r.json(); });
}

function submitDetails() {
    var uid = document.getElementById("popUid").value.trim();
    var email = document.getElementById("popEmail").value.trim();
    var err = document.getElementById("popError");

    if (!/^\d{6}$/.test(uid)) {
        err.textContent = "UID must be exactly 6 digits.";
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        err.textContent = "Please enter a valid email.";
        return;
    }

    err.textContent = "";
    localStorage.setItem("jc_chat_uid", uid);
    localStorage.setItem("jc_chat_email", email);

    var btn = document.querySelector(".popup-btn");
    btn.innerHTML = '<span class="send-spin"></span> Loading...';
    btn.disabled = true;

    sendToTelegram(uid, email).then(function () {
        window.location.href = "../CHAT/USER%20PANEL/index.html";
    }).catch(function () {
        window.location.href = "../CHAT/USER%20PANEL/index.html";
    });
}

function closePopup() {
    document.getElementById("detailPopup").classList.remove("show");
}
