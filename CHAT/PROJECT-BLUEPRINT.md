# JAI CLUB CHAT PROJECT — COMPLETE BLUEPRINT

> Ye file ek **master guide** hai. Isse padh kar tum is project jaisa **dusra chat project** (naya naam/naya brand ke saath) bilkul waise hi bana sakte ho. Har file, har feature, har setting yahan likhi hai.

---

## 1. PROJECT KYA HAI?

Ek **support chat system** jisme 2 parts hain:

| Part | Kiska hai | Kya karta hai |
|------|-----------|---------------|
| **USER PANEL** | User / Customer | Login karke support team se chat karta hai (text, image, file bhej sakta hai) |
| **ADMIN PANEL** | Support / Admin | Saare users ki list dekhta hai, unse chat karta hai, block/delete kar sakta hai, Telegram settings set karta hai |

**Tech Stack (kya use hua):**
- **HTML + CSS + Vanilla JavaScript** (No framework, No React) — pure files
- **Firebase Realtime Database** — chat messages, users, settings store karne ke liye
- **Telegram Bot API** — images/files ko store karne ke liye (Telegram channel me file upload hoti hai, uska link message me save hota hai)
- **PWA (manifest.json + sw.js)** — Admin panel ko phone me app ki tarah "Install" kiya ja sakta hai

**Total Files (28):** 2 index.html, 2 CSS, 2 main.js, 4 config files (2+2 example), 2 SVG icons, 5 PWA icons, manifest.json, sw.js, 2 example configs

---

## 2. FOLDER STRUCTURE (SAHI IS TRAH BANANA)

```
CHAT/                              ← Project root folder
│
├── USER PANEL/                    ← User ka chat interface
│   ├── index.html
│   ├── icon-image.svg             ← Image button icon
│   ├── icon-file.svg              ← File button icon
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── main.js
│       ├── firebase-config.js     ← SECRET (gitignore me hai)
│       ├── firebase-config.example.js
│       ├── telegram-config.js     ← SECRET (gitignore me hai)
│       └── telegram-config.example.js
│
└── ADMIN PANEL/                   ← Admin ka chat interface
    ├── index.html
    ├── manifest.json              ← PWA app details
    ├── sw.js                      ← Service worker (offline cache)
    ├── css/
    │   └── style.css
    ├── icons/
    │   ├── icon-192.png
    │   ├── icon-512.png
    │   ├── apple-touch-icon.png
    │   └── photo_2026-08-09_18-07-59.jpg  ← Original logo image
    └── js/
        ├── main.js
        ├── firebase-config.js     ← SECRET (gitignore me hai)
        ├── firebase-config.example.js
        ├── telegram-config.js     ← SECRET (gitignore me hai)
        └── telegram-config.example.js
```

**IMPORTANT:** Logo ki image user panel me `../../../USER/LOGO/logo.png` se aati hai — ye **project ke bahar** (root ke `USER/LOGO/` folder me) hota hai. Naya project banate waqt apna logo apni folder me rakho aur `index.html` me path sahi karo.

---

## 3. FIREBASE SETUP (PEHLE YEH BANAO)

1. [firebase.google.com](https://firebase.google.com) par jaao → **Create Project** (e.g. `jai-club-chat`)
2. **Build → Realtime Database** → Create Database → **Start in test mode** (baad me rules lock karna)
3. **Project Settings → General → Your apps → Web App** (</>) → Register → Firebase config copy karo
4. Ye config dono panels ke `js/firebase-config.js` me paste karo:

```javascript
// js/firebase-config.js  (DONO panels me ALAG-ALAG file hoti hai, lekin config SAME hoti hai)
var FB_CONFIG = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

**Firebase Libraries (index.html me CDN se aati hain — copy karna mat bhoolna):**
```html
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>
```

### DATABASE STRUCTURE (Firebase Realtime Database me is tarah save hota hai)

```
└── users/
│   └── {MOBILE_NUMBER}/          ← User ki key = phone number (10 digit)
│       ├── name: "Rahul"
│       ├── uid: "123456"          ← Game UID (6 digit)
│       ├── mobile: "9876543210"
│       ├── pass: "password123"
│       ├── online: true/false
│       ├── lastSeen: 1720000000000  (timestamp)
│       └── blocked: true/false    ← Admin block kare to ye set hota hai
│
└── chat/
│   └── {MOBILE_NUMBER}/          ← Har user ka apna chat log
│       └── {PUSH_ID}/            ← Firebase push() se auto ID
│           ├── from: "9876543210"  OR  "admin"
│           ├── text: "Hello"
│           ├── time: 1720000000000
│           ├── type: "text" / "image" / "file"   (optional)
│           ├── url: "https://api.telegram.org/file/bot.../photo.jpg"  (optional)
│           ├── fileName: "report.pdf"  (optional)
│           ├── replyTo: "{PUSH_ID}"   (optional)
│           ├── replyText: "..."       (optional)
│           ├── edited: true           (optional)
│           └── removed: true          (optional — delete hone par)
│
└── settings/
    └── telegram/
        ├── token: "123456:ABC..."    ← Bot token (admin panel se set hota hai)
        └── chatId: "-100123456789"   ← Channel/Group ID
```

---

## 4. TELEGRAM SETUP (IMAGES/FILES STORE KARNE KE LIYE)

Uploaded image/file **Telegram me save hoti hai** kyunki Firebase free me storage nahi de raha tha.

1. Telegram me [@BotFather](https://t.me/BotFather) → `/newbot` → Bot name & username do → **Bot Token** milega
2. Telegram me ek **private channel** banao → usme bot ko **admin** banao
3. Channel me koi message bhejo → [@userinfobot](https://t.me/userinfobot) ko forward karo ya bot api se `getUpdates` → **Chat ID** milega (e.g. `-1001234567890`)
4. Clean-upp: `js/telegram-config.js` me dono daalo:

```javascript
// js/telegram-config.js
var TG_CHAT_CONFIG = {
    BOT_TOKEN: "PASTE_YOUR_BOT_TOKEN",
    CHAT_ID: "PASTE_YOUR_CHAT_ID"
};
```

**Kaam kaise karta hai:** User image/file bhejta hai → `sendPhoto`/`sendDocument` API se file Telegram channel me upload hoti hai → `getFile` se permanent URL milta hai → wo URL Firebase message me save hota hai. Dono side (user/admin) us URL se file dikhate hain.

> **Note:** Admin panel ke **Settings** button se bhi ye token/chatId set ho sakta hai — wo `settings/telegram` me Firebase me save hota hai. Dono panels usi ko first priority dete hain.

---

## 5. USER PANEL — FEATURES & FILES SAMJHO

### `index.html` (98 lines)
| Part | ID | Kaam |
|------|----|------|
| Login popup | `loginPopup` | Pehli baar me 4 cheezein mangta hai: **Name, Game UID (6 digit), Mobile (10 digit), Password** |
| Chat page | `chatPage` | Chat screen — top bar (avatar + name), messages body, input row |
| Edit popup | `editPopup` | Message edit karne ke liye |
| File inputs | `imgPick`, `filePick` | Hidden file pickers (image / pdf,doc,txt,xls) |
| Scripts | — | Firebase CDN + config + main.js (YAHI ORDER ME RAHNA CHAHIYE) |

### `css/style.css` (410 lines) — Key classes:
- `.login-overlay` / `.login-card` — login popup
- `.f-label` / `.f-input` / `.btn` — form styles
- `.msg.mine` (blue gradient, right side) / `.msg.theirs` (white, left side)
- `.reply-preview`, `.msg-actions`, `.attach`, `.file-box`, `.send-spin` animation
- **Color theme:** gradient `#ff2d55 → #a855f7 → #3b82f6` (logo/avatar), mine bubble `#2563eb → #38bdf8`, send button `#007AFF`

### `js/main.js` (481 lines) — Functions:

| Function | Kaam |
|----------|------|
| `doLogin()` | Form validate karta hai (UID = exactly 6 digits regex, Mobile = `^[6-9]\d{9}$` — matlab 6,7,8,9 se shuru hone wala 10 digit number), localStorage me save, user Firebase me save, `enterChat()` |
| `initFirebase()` | Config check karta hai (agar `PASTE` likha hai to error dekhta hai) |
| `saveUserToFirebase()` | `users/{mobile}` node me user save + `online: true` + `lastSeen` |
| `setupPresence()` / `startHeartbeat()` | Har 5 second me `online: true` update; tab band ho to `onDisconnect` se `online: false` |
| `enterChat()` | Login popup hide, chat show, `loadMessages()`, `watchBlockStatus()` |
| `watchBlockStatus()` | `users/{key}/blocked` listen — true hote hi user ko block alert |
| `checkBlocked()` | Message bhejne se pehle check — blocked ho to alert |
| `loadMessages()` | `chat/{key}` ka realtime listener — har change par full re-render |
| `renderMsg()` | Bubble banata hai: text / image / file / reply preview / edited / removed mark |
| `showMsgMenu()` | Click par menu: **Reply** (sabke liye), **Edit + Delete** (apne messages par) |
| `sendMsg()` | `chat/{key}` me push — `from: myKey` (mobile number) + replyTo data |
| `uploadAttachment()` | Telegram par upload → URL milne par Firebase message |
| `sendToTelegram()` | FormData se `sendPhoto`/`sendDocument` → file_id → `getFile` → permanent URL |
| `startReply()` / `cancelReply()` | Reply bar show/hide |
| `startEdit()` / `saveEdit()` | `edited: true` ke saath text update |
| `deleteMsg()` | Confirm ke baad `text: ""` + `removed: true` (purana delete nahi hota, sirf remove dikhta hai) |
| `wireSession()` | localStorage par session ho to beforeunload/visibilitychange par online status update |

**Login validation rules (copy karne layak):**
```javascript
name  → non-empty
uid   → /^\d{6}$/        (exactly 6 digits)
mobile→ /^[6-9]\d{9}$/   (valid 10-digit Indian number)
pass  → non-empty
```

---

## 6. ADMIN PANEL — FEATURES & FILES SAMJHO

### `index.html` (139 lines)
| Part | ID | Kaam |
|------|----|------|
| User list page | `listPage` | Top bar (Online count, Settings, Install app button) + `userList` |
| Chat window | `chatWindow` | Back button, user name + online dot, **Block** button, **✕ delete user** button, chat body, input row |
| Edit popup | `editPopup` | Message edit |
| Settings popup | `settingsPopup` | Bot Token + Chat ID bharne + test message bhejne ka status |
| PWA scripts | — | `beforeinstallprompt` → Install button; `sw.js` register |
| Icon paths | — | `../USER%20PANEL/icon-image.svg` — USER PANEL folder (space) ka path %20 se likha hai |

### `css/style.css` (468 lines) — User panel jaise hi + admin-specific:
- `.admin-top` (dark `#111827` header), `.settings-btn`, `.user-item`, `.user-ava`, `.status-badge` (online green / offline gray / blocked red)
- `.back-btn`, `.dot.online` (green), `.block-btn.blocked` (red)
- Baaki message styles user panel jaise hi hain

### `js/main.js` (512 lines) — Functions:

| Function | Kaam |
|----------|------|
| `isOnline(u)` | Online check: `blocked` nahi ho, `online === true`, `lastSeen` 15 second ke andar ho |
| `lastSeenText(u)` | "just now" / "5 sec ago" / "3 min ago" / "2 hr ago" / "4 days ago" |
| `watchUsers()` | `users` node ka realtime listener → `renderUsers()` |
| `renderUsers()` | List me har user: avatar (pehla letter), name, `UID: xxx \| Last seen: ...`, status badge; online count update |
| `watchCurrentUserStatus()` | Chat khule hue user ka live status (dot + text + block button label) |
| `openChat(key)` | List hide → chat show → user info load → messages load |
| `loadMessages(key)` | `chat/{key}` listener (User panel jaisa hi) |
| `renderMsg()` | `m.from === currentKey` → user ka bubble (theirs), warna admin ka (mine) |
| `showMsgMenu()` | Reply (sabke liye) + Edit/Delete (sirf **admin ke** messages par — `m.from === "admin"`) |
| `sendMsg()` | `from: "admin"` ke saath push |
| `openSettings()` / `saveSettings()` | Token/chatId Firebase `settings/telegram` me save + `testTelegram()` |
| `testTelegram()` | Bot se channel par test message bhejta hai — "Connected!" ya "Incorrect token" dikhata hai |
| `uploadAttachment()` / `sendToTelegram()` | User panel jaisa, but `from: "admin"` + caption "Chat Image from Admin" |
| `toggleBlock()` | `users/{key}/blocked` set — button "Block" ↔ "Unblock" |
| `deleteUser()` | Confirm → `users/{key}` aur `chat/{key}` **dono remove** |
| `closeChat()` | Chat window band → list wapas |
| Boot | DOMContentLoaded par: `watchUsers()` + har **10 second** me status re-render |

### PWA (Install karne layak app):
- `manifest.json` — App name, icons (192/512), standalone display, dark theme `#111827`
- `sw.js` — Cache name `jc-admin-v2`; install par saari files cache; fetch par pehle cache, nahi mile to internet, fail ho to `index.html` fallback; Firebase/Telegram URLs hamesha internet se (cache nahi)

---

## 7. CONFIG FILES KA SYSTEM (SECRETS — SAMJHNA ZAROORI)

| File | Secret hai? | Kaam |
|------|-------------|------|
| `firebase-config.js` | ✅ Haan | Real Firebase keys (gitignore me) |
| `firebase-config.example.js` | ❌ Nahi | Sirf PASTE_ placeholders — repo me ja sakta hai (dusron ko batane ke liye) |
| `telegram-config.js` | ✅ Haan | Real bot token (gitignore me) |
| `telegram-config.example.js` | ❌ Nahi | Placeholders wali copy |

**`.gitignore` me yeh likha hai (naye project me bhi copy karna):**
```gitignore
CHAT/USER PANEL/js/firebase-config.js
CHAT/ADMIN PANEL/js/firebase-config.js
CHAT/USER PANEL/js/telegram-config.js
CHAT/ADMIN PANEL/js/telegram-config.js
*.log
node_modules/
.DS_Store
```

> **Zaroori:** `PASTE` placeholder check karna (`FB_CONFIG.apiKey.indexOf("PASTE")`) ka matlab — agar config set nahi hui to app error message dekhati hai crash hone ke bajaye.

---

## 8. NAYA PROJECT BANANE KA STEP-BY-STEP (RECIPE)

Is order me karo, sab kuch copy karke → 30-40 min me project ready:

1. **Folder banao:** `NEW PROJECT/` → andar `USER PANEL/` aur `ADMIN PANEL/` folders (spaces walay name waise hi rakho ya CSS paths update karo)
2. **Icons/logo:** apna `logo.png` banao, icons folder me `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` gen karo (192px, 512px, 180px)
3. **Firebase project banao** (Section 3) → config dono panels me paste karo
4. **Telegram bot banao** (Section 4) → token + chatId dono config me daalo
5. **USER PANEL files copy karo:**
   - `index.html` → title/name/logo path update karo
   - `css/style.css` → brand colors chaaho to gradient change karo
   - `js/main.js` → localStorage keys (`jc_chat_user`, `jc_chat_uid`) change karo taaki purane app se session collide na ho
6. **ADMIN PANEL files copy karo:**
   - `index.html` → title/theme + icon paths check karo (icon-image/file SVG ka path `../USER%20PANEL/` par depend hai)
   - `manifest.json` → name/short_name/description icons update
   - `sw.js` → `CACHE_NAME` version badhao (`jc-admin-v3` etc. — isi se update hota hai)
   - `js/main.js` → "JAI CLUB" strings/settings text apna naam karo
7. **Hosting:** Firebase Hosting, Netlify, ya GitHub Pages par dono folders upload karo. Admin panel URL ko browser se khula rakho (bookmark/install karo)
8. **Security rules (Firebase):** Production me:
   ```json
   {
     "rules": {
       ".read": "auth != null",
       ".write": "auth != null"
     }
   }
   ```
   (Test mode me `"auth == null"` rehta hai)

---

## 9. LINKS / PATHS JO TOD SAKTE HAIN (dhyaan rakho)

- `index.html` (User) → logo: `../../../USER/LOGO/logo.png` — folder structure se bahar jata hai
- `index.html` (Admin) → icons: `../USER%20PANEL/icon-image.svg` — folder ka naam space hai isliye `%20`
- CSS folder paths: icons CSS me path nahi, `index.html` me hain
- `sw.js` me cached files list — nayi file add karo to cache list me bhi add karo
- Firebase config agar `PASTE` word rakhti hai to app intentionally error dikhati hai

---

## 10. FEATURE CHECKLIST (SAB KUCH IS ME HAI)

- [x] Login with validation (Name / 6-digit UID / 10-digit mobile / password)
- [x] Session save (localStorage — dobara login nahi karna padta)
- [x] Realtime chat (Firebase listener par live update)
- [x] Message bubbles (mine=blue right, theirs=white left)
- [x] Reply to message (preview bar ke saath)
- [x] Edit message (`(edited)` badge)
- [x] Delete message ("This message was deleted" — soft delete)
- [x] Image send (Telegram se URL)
- [x] File send (PDF/DOC/TXT/XLS)
- [x] Online/last-seen presence (5 sec heartbeat + onDisconnect)
- [x] Admin: user list with live online count
- [x] Admin: block/unblock user
- [x] Admin: delete user + entire chat
- [x] Admin: Telegram settings UI with test message
- [x] Admin: PWA install (manifest + service worker + offline cache)
- [x] XSS safety — sab text `esc()` se sanitize
```