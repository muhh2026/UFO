// Eigenes Fadenkreuz (roter Punkt + weiße Linien), folgt der Maus.
document.addEventListener("mousemove", (e) => {
  let d = document.getElementById("reddot"),
    m = document.getElementById("message"),
    h = document.getElementById("hud");
  let hide =
    (m && getComputedStyle(m).display !== "none") ||
    (h && e.target.closest && e.target.closest("#hud,button"));
  if (d) {
    d.style.display = hide ? "none" : "block";
    d.style.left = e.clientX - 3 + "px";
    d.style.top = e.clientY - 3 + "px";
  }
});

// Fadenkreuz-Linien um den Mauszeiger.
document.addEventListener("mousemove", (e) => {
  let t = document.getElementById("lineT"),
    b = document.getElementById("lineB"),
    l = document.getElementById("lineL"),
    r = document.getElementById("lineR"),
    m = document.getElementById("message"),
    h = document.getElementById("hud");
  let hide =
    (m && getComputedStyle(m).display !== "none") ||
    (h && e.target.closest && e.target.closest("#hud,button"));
  if (t) {
    t.style.display = hide ? "none" : "block";
    b.style.display = hide ? "none" : "block";
    l.style.display = hide ? "none" : "block";
    r.style.display = hide ? "none" : "block";
    t.style.left = e.clientX - 1 + "px";
    t.style.top = e.clientY - 16 + "px";
    b.style.left = e.clientX - 1 + "px";
    b.style.top = e.clientY + 8 + "px";
    l.style.left = e.clientX - 16 + "px";
    l.style.top = e.clientY - 1 + "px";
    r.style.left = e.clientX + 8 + "px";
    r.style.top = e.clientY - 1 + "px";
  }
});

// Globaler Klick-Handler für den 'ZUM STARTMENÜ'-Button.
document.addEventListener("click", function (e) {
  if (e.target && e.target.id === "menu") location.reload();
});

// Service Worker registrieren (PWA / Offline-Cache für lokale Dateien).
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(function () {});
}
