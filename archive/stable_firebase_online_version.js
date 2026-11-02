const CDN = "https:" + "//www.gstatic.com/firebasejs/13.1.0/";

async function startFirebaseTest() {
  try {
    const appSdk = await import(CDN + "firebase-app.js");
    const authSdk = await import(CDN + "firebase-auth.js");
    const dbSdk = await import(CDN + "firebase-database.js");

    const firebaseConfig = {
      apiKey: "AIzaSyCKT7YHlFGy90-3_sGoU-Qzys4VQrCuHIA",
      authDomain: "ufo-jagd.firebaseapp.com",
      databaseURL: "https:" + "//ufo-jagd-default-rtdb.firebaseio.com",
      projectId: "ufo-jagd",
      storageBucket: "ufo-jagd.firebasestorage.app",
      messagingSenderId: "49353986053",
      appId: "1:49353986053:web:c2ad012df612d722024c6c"
    };

    const app = appSdk.initializeApp(firebaseConfig);
    const auth = authSdk.getAuth(app);
    const db = dbSdk.getDatabase(app);

    window.ufoFirebase = {
      status: "VERBINDE",
      uid: null,
      app,
      auth,
      db
    };

    const credential = await authSdk.signInAnonymously(auth);

    window.ufoFirebase.status = "ONLINE";
    window.ufoFirebase.uid = credential.user.uid;

    console.log("UFO Firebase: ONLINE");
    console.log("Anonyme UID:", credential.user.uid);

  } catch (error) {
    window.ufoFirebase = {
      status: "FEHLER",
      error: String(error)
    };

    console.error("UFO Firebase Fehler:", error);
  }
}

startFirebaseTest();


async function saveOnlineScore(name,score){if(!window.ufoFirebase||window.ufoFirebase.status!=="ONLINE")return;const d=await import(CDN+"firebase-database.js");name=String(name||"Spieler").trim().slice(0,18)||"Spieler";score=Math.floor(Number(score)||0);if(!score)return;await d.push(d.ref(window.ufoFirebase.db,"highscores"),{name:name,score:score,timestamp:d.serverTimestamp()});console.log("Online-Highscore gespeichert:",name,score);}
async function loadOnlineScores(){if(!window.ufoFirebase||window.ufoFirebase.status!=="ONLINE")return;const d=await import(CDN+"firebase-database.js");const q=d.query(d.ref(window.ufoFirebase.db,"highscores"),d.orderByChild("score"),d.limitToLast(10));d.onValue(q,function(s){let a=[];s.forEach(function(c){let v=c.val();if(v&&typeof v.score==="number")a.push(v);});a.sort(function(x,y){return y.score-x.score;});window.onlineHighscores=a;window.renderOnlineScores();console.log("ONLINE TOP 10:",a);});}
window.saveOnlineScore=saveOnlineScore;
var onlineTimer=setInterval(function(){if(window.ufoFirebase&&window.ufoFirebase.status==="ONLINE"){clearInterval(onlineTimer);loadOnlineScores();}},250);

window.renderOnlineScores=function(){var q=document.getElementById("scores");if(!q||!window.onlineHighscores)return;q.replaceChildren();if(!window.onlineHighscores.length){var e=document.createElement("li");e.textContent="Noch kein Online-Eintrag";q.appendChild(e);return;}window.onlineHighscores.forEach(function(v,i){var e=document.createElement("li");e.textContent=(i+1)+". "+String(v.name||"Spieler")+" - "+Number(v.score||0).toLocaleString("de-DE")+" Punkte";q.appendChild(e);});};var onlineMenu=document.getElementById("message");if(onlineMenu)new MutationObserver(function(){setTimeout(window.renderOnlineScores,0);}).observe(onlineMenu,{childList:true});
