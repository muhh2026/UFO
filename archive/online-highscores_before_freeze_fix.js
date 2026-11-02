import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  query,
  orderByChild,
  limitToLast,
  onValue,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCKT7YHlFGy90-3_sGoU-Qzys4VQrCuHIA",
  authDomain: "ufo-jagd.firebaseapp.com",
  databaseURL: "https://ufo-jagd-default-rtdb.firebaseio.com",
  projectId: "ufo-jagd",
  storageBucket: "ufo-jagd.firebasestorage.app",
  messagingSenderId: "49353986053",
  appId: "1:49353986053:web:c2ad012df612d722024c6c",
  measurementId: "G-1RF0RVK8JX"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

let currentUser = null;
let pendingScore = null;
let onlineScores = [];
let rendering = false;

const originalSetItem = Storage.prototype.setItem;

Storage.prototype.setItem = function (key, value) {
  originalSetItem.call(this, key, value);

  if (this !== window.localStorage || key !== "ufoScores") {
    return;
  }

  try {
    const scores = JSON.parse(value);

    if (!Array.isArray(scores) || scores.length === 0) {
      return;
    }

    const newest = scores
      .filter(function (entry) {
        return (
          entry &&
          typeof entry.name === "string" &&
          Number.isFinite(Number(entry.score))
        );
      })
      .sort(function (a, b) {
        return Number(b.score) - Number(a.score);
      })[0];

    if (!newest) {
      return;
    }

    queueOnlineScore(newest.name, newest.score);
  } catch (error) {
    console.warn("Lokaler Highscore konnte nicht gelesen werden.", error);
  }
};

function cleanName(value) {
  return String(value || "Spieler")
    .replace(/[.#$[\]/]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 18) || "Spieler";
}

function cleanScore(value) {
  const score = Math.floor(Number(value));

  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(score, 9999999));
}

function scoreFingerprint(name, score) {
  return cleanName(name) + ":" + cleanScore(score);
}

function queueOnlineScore(name, score) {
  const safeName = cleanName(name);
  const safeScore = cleanScore(score);

  if (safeScore <= 0) {
    return;
  }

  const fingerprint = scoreFingerprint(safeName, safeScore);

  if (sessionStorage.getItem("lastOnlineScore") === fingerprint) {
    return;
  }

  pendingScore = {
    name: safeName,
    score: safeScore,
    fingerprint: fingerprint
  };

  uploadPendingScore();
}

async function uploadPendingScore() {
  if (!currentUser || !pendingScore) {
    return;
  }

  const scoreToUpload = pendingScore;
  pendingScore = null;

  try {
    await push(ref(database, "highscores"), {
      name: scoreToUpload.name,
      score: scoreToUpload.score,
      timestamp: serverTimestamp()
    });

    sessionStorage.setItem(
      "lastOnlineScore",
      scoreToUpload.fingerprint
    );

    setStatus("Online verbunden");
  } catch (error) {
    pendingScore = scoreToUpload;
    console.error("Online-Highscore konnte nicht gespeichert werden.", error);
    setStatus("Speichern fehlgeschlagen");
  }
}

function ensureOnlineScoreCard() {
  const menu = document.getElementById("message");

  if (!menu) {
    return null;
  }

  const card = menu.querySelector(".card");

  if (!card) {
    return null;
  }

  let onlineBox = card.querySelector("#onlineScoresBox");

  if (!onlineBox) {
    onlineBox = document.createElement("div");
    onlineBox.id = "onlineScoresBox";
    onlineBox.className = "scores onlineScores";

    const title = document.createElement("b");
    title.textContent = "ONLINE TOP 10";

    const status = document.createElement("small");
    status.id = "onlineScoreStatus";
    status.textContent = "Verbindung wird hergestellt...";

    const list = document.createElement("ol");
    list.id = "onlineScores";

    onlineBox.appendChild(title);
    onlineBox.appendChild(status);
    onlineBox.appendChild(list);
    card.appendChild(onlineBox);
  }

  return onlineBox;
}

function setStatus(text) {
  const box = ensureOnlineScoreCard();

  if (!box) {
    return;
  }

  const status = box.querySelector("#onlineScoreStatus");

  if (status) {
    status.textContent = text;
  }
}

function renderOnlineScores() {
  if (rendering) {
    return;
  }

  const box = ensureOnlineScoreCard();

  if (!box) {
    return;
  }

  const list = box.querySelector("#onlineScores");

  if (!list) {
    return;
  }

  rendering = true;
  list.replaceChildren();

  if (onlineScores.length === 0) {
    const item = document.createElement("li");
    item.textContent = "Noch kein Online-Eintrag";
    list.appendChild(item);
  } else {
    onlineScores.forEach(function (entry) {
      const item = document.createElement("li");
      item.textContent =
        cleanName(entry.name) +
        " - " +
        cleanScore(entry.score).toLocaleString("de-DE") +
        " Punkte";

      list.appendChild(item);
    });
  }

  rendering = false;
}

function startOnlineLeaderboard() {
  const topScoresQuery = query(
    ref(database, "highscores"),
    orderByChild("score"),
    limitToLast(10)
  );

  onValue(
    topScoresQuery,
    function (snapshot) {
      const loadedScores = [];

      snapshot.forEach(function (childSnapshot) {
        const value = childSnapshot.val();

        if (
          value &&
          typeof value.name === "string" &&
          Number.isFinite(Number(value.score))
        ) {
          loadedScores.push({
            name: cleanName(value.name),
            score: cleanScore(value.score)
          });
        }
      });

      onlineScores = loadedScores
        .sort(function (a, b) {
          return b.score - a.score;
        })
        .slice(0, 10);

      setStatus("Online verbunden");
      renderOnlineScores();
    },
    function (error) {
      console.error("Online-Highscores konnten nicht geladen werden.", error);
      setStatus("Highscores nicht erreichbar");
    }
  );
}

const onlineStyle = document.createElement("style");
onlineStyle.textContent = `
  #onlineScoresBox {
    margin-top: 12px;
    max-width: 320px;
  }

  #onlineScoresBox b {
    color: #ffdf70;
    text-shadow: 0 0 8px rgba(255, 190, 40, 0.75);
  }

  #onlineScoreStatus {
    display: block;
    margin: 4px 0 7px;
    color: #8fddec;
    font-size: 10px;
    font-weight: 600;
  }

  #onlineScores {
    margin-top: 5px;
  }

  #onlineScores li {
    color: #d8fbff;
  }
`;

document.head.appendChild(onlineStyle);

const menuObserver = new MutationObserver(function () {
  ensureOnlineScoreCard();
  renderOnlineScores();
});

const messageElement = document.getElementById("message");

if (messageElement) {
  menuObserver.observe(messageElement, {
    childList: true,
    subtree: true
  });
}

ensureOnlineScoreCard();
renderOnlineScores();
startOnlineLeaderboard();

onAuthStateChanged(auth, function (user) {
  currentUser = user || null;

  if (currentUser) {
    setStatus("Online verbunden");
    uploadPendingScore();
  }
});

signInAnonymously(auth).catch(function (error) {
  console.error("Anonyme Anmeldung fehlgeschlagen.", error);
  setStatus("Anmeldung fehlgeschlagen");
});
