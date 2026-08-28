var app = {};
var currentUser = null;
var currentKey = null;
var replyTo = null;
var editingId = null;
var lastMsg = {};
var tgConfig = { BOT_TOKEN: "", CHAT_ID: "" };
var tgLoaded = false;
var busyUpload = false;
var loadedMsgKeys = {};

function esc(s) {
    return String(s == null ? "" : s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function isOnline(u) {
    if (!u || u.blocked) return false;
    if (u.online !== true) return false;
    if (!u.lastSeen) return false;
    var age = Date.now() - u.lastSeen;
    return age < 15000;
}

function lastSeenText(u) {
    if (!u || !u.lastSeen) return "Never";
    var age = Date.now() - u.lastSeen;
    if (age < 15000) return "just now";
    if (age < 60000) return Math.floor(age / 1000) + " sec ago";
    if (age < 3600000) return Math.floor(age / 60000) + " min ago";
    if (age < 86400000) return Math.floor(age / 3600000) + " hr ago";
    return Math.floor(age / 86400000) + " days ago";
}

function initFirebase() {
    if (FB_CONFIG.apiKey.indexOf("PASTE") !== -1) {
        document.getElementById("userList").innerHTML = '<div class="empty-state"><p>Firebase not configured</p><span>Add your Firebase settings in js/firebase-config.js</span></div>';
        return false;
    }
    firebase.initializeApp(FB_CONFIG);
    return true;
}

/* ============ USER LIST ============ */
function watchUsers() {
    firebase.database().ref("users").on("value", function (snap) {
        app = {};
        var data = snap.val() || {};
        Object.keys(data).forEach(function (k) {
            app[k] = data[k];
        });
        renderUsers();
    });
}

function watchCurrentUserStatus(key) {
    firebase.database().ref("users/" + key).on("value", function (snap) {
        var u = snap.val() || {};
        app[key] = u;
        currentUser = u;
        var onlineNow = isOnline(u);
        var cuDot = document.getElementById("cuDot");
        var cuStatus = document.getElementById("cuStatus");
        if (cuDot) cuDot.className = "dot" + (onlineNow ? " online" : "");
        if (cuStatus) {
            cuStatus.textContent = u.blocked ? "Blocked" : (onlineNow ? "Online" : "Last seen " + lastSeenText(u));
            cuStatus.className = "cu-status" + (onlineNow ? " online" : "");
        }
        var blockBtn = document.getElementById("blockBtn");
        if (blockBtn) {
            blockBtn.querySelector("span").textContent = u.blocked ? "Unblock" : "Block";
            blockBtn.classList.toggle("blocked", !!u.blocked);
        }
    });
}

function getUserLastMsg(key) {
    var chatData = null;
    firebase.database().ref("chat/" + key).orderByKey().limitToLast(1).once("value", function (snap) {
        chatData = snap.val();
    });
    if (!chatData) return "";
    var keys = Object.keys(chatData);
    if (keys.length === 0) return "";
    var m = chatData[keys[0]];
    if (m.type === "image") return "📷 Image";
    if (m.type === "file") return "📎 " + (m.fileName || "File");
    return m.text || "";
}

function renderUsers() {
    var list = document.getElementById("userList");
    var searchTerm = document.getElementById("searchInput").value.toLowerCase();
    list.innerHTML = "";
    var online = 0;

    var keys = Object.keys(app).sort();
    var filteredKeys = keys.filter(function (k) {
        var u = app[k];
        var name = (u.name || "").toLowerCase();
        var uid = (u.uid || "").toLowerCase();
        return name.indexOf(searchTerm) !== -1 || uid.indexOf(searchTerm) !== -1;
    });

    if (filteredKeys.length === 0) {
        list.innerHTML = '<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><p>' + (searchTerm ? "No users found" : "No users yet") + '</p><span>Users will appear here when they start chatting</span></div>';
        document.getElementById("onlineCount").textContent = "0";
        return;
    }

    filteredKeys.forEach(function (k) {
        var u = app[k];
        var onlineNow = isOnline(u);
        if (onlineNow) online++;

        var item = document.createElement("div");
        item.className = "user-item";

        var badge = "";
        if (u.blocked) badge = '<span class="status-badge blocked">Blocked</span>';
        else if (onlineNow) badge = '<span class="status-badge online">Online</span>';
        else badge = '<span class="status-badge offline">Offline</span>';

        var last = lastSeenText(u);
        var initial = u.name ? u.name.charAt(0).toUpperCase() : "U";

        item.innerHTML =
            '<div class="user-ava">' + esc(initial) + "</div>" +
            '<div class="user-info">' +
                '<div class="user-name">' + esc(u.name || "Unknown") + "</div>" +
                '<div class="user-meta">' +
                    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h6"/></svg> ' +
                    esc(u.uid || "-") +
                    ' <span style="color:#cbd5e1">|</span> ' +
                    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ' +
                    last +
                "</div>" +
            "</div>" +
            badge;

        item.onclick = function () { openChat(k); };
        list.appendChild(item);
    });

    document.getElementById("onlineCount").textContent = online;
}

function filterUsers() {
    renderUsers();
}

/* ============ OPEN CHAT ============ */
function openChat(key) {
    if (!app[key]) return;
    currentKey = key;
    currentUser = app[key];
    replyTo = null;
    loadedMsgKeys = {};
    cancelReply();

    document.getElementById("listPage").classList.add("hidden");
    document.getElementById("chatWindow").classList.remove("hidden");

    document.getElementById("cuName").textContent = currentUser.name || "User";
    document.getElementById("cuAvatar").textContent = (currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "U");

    var onlineNow = isOnline(currentUser);
    var cuStatus = document.getElementById("cuStatus");
    cuStatus.textContent = currentUser.blocked ? "Blocked" : (onlineNow ? "Online" : "Last seen " + lastSeenText(currentUser));
    cuStatus.className = "cu-status" + (onlineNow ? " online" : "");

    var blockBtn = document.getElementById("blockBtn");
    blockBtn.querySelector("span").textContent = currentUser.blocked ? "Unblock" : "Block";
    blockBtn.classList.toggle("blocked", !!currentUser.blocked);

    watchCurrentUserStatus(key);
    loadMessages(key);
}

/* ============ MESSAGES ============ */
function loadMessages(key) {
    firebase.database().ref("chat/" + key).on("value", function (snap) {
        var body = document.getElementById("chatBody");
        var data = snap.val();

        if (!data) {
            body.innerHTML = '<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>No messages yet</p></div>';
            loadedMsgKeys = {};
            return;
        }

        var newKeys = Object.keys(data);
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
    div.className = "msg " + (m.from === currentKey ? "theirs" : "mine");
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
        inner = "<i>This message was deleted</i>";
        div.classList.add("removed");
    } else {
        inner += '<span class="msg-time">' + timeStr(m.time) + "</span>";
    }

    div.innerHTML = inner;
    lastMsg[key] = m;

    div.onclick = function (e) {
        e.stopPropagation();
        showMsgMenu(div, key, m);
    };

    body.appendChild(div);
}

function showMsgMenu(el, key, m) {
    closeMenu();
    if (m.removed) return;
    var menu = document.createElement("div");
    var buttons = '<button class="reply" onclick="startReply(\'' + key + '\')">Reply</button>';
    if (m.from === "admin") {
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

/* ============ SEND ============ */
function sendMsg() {
    var input = document.getElementById("msgInput");
    var text = input.value.trim();
    if (!currentKey || text === "") return;

    var data = {
        from: "admin",
        text: text,
        time: firebase.database.ServerValue.TIMESTAMP
    };
    if (replyTo) {
        data.replyTo = replyTo;
        data.replyText = replyToText();
        cancelReply();
    }
    firebase.database().ref("chat/" + currentKey).push().set(data);
    input.value = "";
    scrollBottom();
}

/* ============ TELEGRAM SETTINGS ============ */
function loadTgSettings() {
    if (tgLoaded) return;
    tgLoaded = true;
    tgConfig.BOT_TOKEN = window.TG_CHAT_CONFIG ? TG_CHAT_CONFIG.BOT_TOKEN : "";
    tgConfig.CHAT_ID = window.TG_CHAT_CONFIG ? TG_CHAT_CONFIG.CHAT_ID : "";
    firebase.database().ref("settings/telegram").on("value", function (snap) {
        var v = snap.val() || {};
        if (v.token) tgConfig.BOT_TOKEN = v.token;
        if (v.chatId) tgConfig.CHAT_ID = v.chatId;
    });
}

function openSettings() {
    loadTgSettings();
    document.getElementById("setToken").value = tgConfig.BOT_TOKEN || "";
    document.getElementById("setChatId").value = tgConfig.CHAT_ID || "";
    var status = document.getElementById("tgStatus");
    status.classList.add("hidden");
    status.className = "tg-status hidden";
    document.getElementById("settingsPopup").classList.remove("hidden");
}

function closeSettings() {
    document.getElementById("settingsPopup").classList.add("hidden");
}

function saveSettings() {
    var token = document.getElementById("setToken").value.trim();
    var chatId = document.getElementById("setChatId").value.trim();
    var status = document.getElementById("tgStatus");

    if (!token || !chatId) {
        status.textContent = "Bot Token and Chat ID both are required.";
        status.className = "tg-status error";
        status.classList.remove("hidden");
        return;
    }

    tgConfig.BOT_TOKEN = token;
    tgConfig.CHAT_ID = chatId;
    firebase.database().ref("settings/telegram").set({ token: token, chatId: chatId });
    status.textContent = "Saving...";
    status.className = "tg-status success";
    status.classList.remove("hidden");

    testTelegram(token, chatId);
}

function testTelegram(token, chatId) {
    var status = document.getElementById("tgStatus");
    var fd = new FormData();
    fd.append("chat_id", chatId);
    fd.append("text", "JAI CLUB Admin Panel connected ✅");
    fetch("https://api.telegram.org/bot" + token + "/sendMessage", { method: "POST", body: fd })
        .then(function (r) { return r.json(); })
        .then(function (j) {
            if (j.ok) {
                status.textContent = "Connected! Test message sent successfully.";
                status.className = "tg-status success";
            } else {
                status.textContent = "Error: " + (j.description || "Invalid token or chat ID");
                status.className = "tg-status error";
            }
        })
        .catch(function () {
            status.textContent = "Network error. Check your internet.";
            status.className = "tg-status error";
        });
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
    if (!currentKey) return;
    if (busyUpload) return;
    setBusy(true);

    var bubbleId = "send-" + Date.now();
    var label = type === "image" ? "Sending image..." : "Sending " + esc(file.name) + "...";
    showSendingBubble(bubbleId, label);

    sendToTelegram(file, type).then(function (url) {
        var data = {
            from: "admin",
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
        firebase.database().ref("chat/" + currentKey).push().set(data);
        scrollBottom();
        setBusy(false);
    }).catch(function (err) {
        removeSendingBubble(bubbleId);
        setBusy(false);
        alert("Upload failed. Please try again." + (err && err.message ? "\n" + err.message : ""));
        scrollBottom();
    });
}

function sendToTelegram(file, type) {
    var token = tgConfig.BOT_TOKEN;
    var chatId = tgConfig.CHAT_ID;
    if (!token || !chatId) {
        alert("Please configure Telegram in Settings first.");
        return Promise.reject("no tg config");
    }
    var fd = new FormData();
    fd.append("chat_id", chatId);
    if (type === "image") {
        fd.append("photo", file);
        fd.append("caption", "Chat Image from Admin");
    } else {
        fd.append("document", file);
        fd.append("caption", "Chat File from Admin");
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
    if (text === "" || !currentKey) return;
    firebase.database().ref("chat/" + currentKey + "/" + editingId).update({ text: text, edited: true });
    closeEdit();
}

function closeEdit() {
    editingId = null;
    document.getElementById("editPopup").classList.add("hidden");
}

/* ============ DELETE / BLOCK ============ */
function deleteMsg(key) {
    closeMenu();
    if (!confirm("Delete this message?")) return;
    firebase.database().ref("chat/" + currentKey + "/" + key).update({ text: "", removed: true });
}

function toggleBlock() {
    if (!currentKey) return;
    var newVal = !app[currentKey].blocked;
    firebase.database().ref("users/" + currentKey).update({ blocked: newVal });
    app[currentKey].blocked = newVal;
    document.getElementById("blockBtn").querySelector("span").textContent = newVal ? "Unblock" : "Block";
    document.getElementById("blockBtn").classList.toggle("blocked", newVal);
    var cuStatus = document.getElementById("cuStatus");
    cuStatus.textContent = newVal ? "Blocked" : (app[currentKey].online ? "Online" : "Offline");
}

function deleteUser() {
    if (!currentKey) return;
    var name = app[currentKey].name || "this user";
    if (!confirm("Delete " + name + "? This removes the user and all their chats.")) return;
    firebase.database().ref("users/" + currentKey).remove();
    firebase.database().ref("chat/" + currentKey).remove();
    closeChat();
}

function closeChat() {
    currentKey = null;
    document.getElementById("listPage").classList.remove("hidden");
    document.getElementById("chatWindow").classList.add("hidden");
    cancelReply();
}

/* ============ BOOT ============ */
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("editPopup").classList.add("hidden");
    document.getElementById("settingsPopup").classList.add("hidden");
    if (initFirebase()) {
        loadTgSettings();
        watchUsers();
        setInterval(function () {
            renderUsers();
            if (currentKey && currentUser) {
                var u = currentUser;
                var onlineNow = isOnline(u);
                var cuStatus = document.getElementById("cuStatus");
                if (cuStatus) {
                    cuStatus.textContent = u.blocked ? "Blocked" : (onlineNow ? "Online" : "Last seen " + lastSeenText(u));
                    cuStatus.className = "cu-status" + (onlineNow ? " online" : "");
                }
            }
        }, 10000);
    }
});
