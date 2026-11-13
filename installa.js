/* Installazione: pulsante «Installa» quando Chrome lo permette, istruzioni quando non lo permette.
   Non tocca le schermate dell'app: è una striscia a parte, che si può chiudere. */
let evento = null;
const installata = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const chiusa = () => { try { return sessionStorage.getItem("fit-installa-chiusa") === "1"; } catch { return false; } };
const ua = navigator.userAgent;
const chromeVero = /Chrome\/\d+/.test(ua) && !/SamsungBrowser|HeyTap|OPR\/|EdgA|YaBrowser|; wv\)/.test(ua);

function striscia(){
  document.getElementById("installa")?.remove();
  if (installata() || chiusa()) return;
  const d = document.createElement("div");
  d.id = "installa"; d.className = "installa"; d.setAttribute("role", "region"); d.setAttribute("aria-label", "Installa l'app");
  const testo = evento
    ? `<b>Installa Foresterie in tasca</b><span>Avrai l'icona tra le app e funzionerà anche senza rete.</span>`
    : chromeVero
      ? `<b>Per installare l'app</b><span>Menu ⋮ in alto a destra, «Aggiungi a schermata Home», poi «Installa».</span>`
      : `<b>Apri questa pagina in Chrome</b><span>Questo browser non installa le app web. Copia l'indirizzo e aprilo in Chrome.</span>`;
  d.innerHTML = `<div class="tx">${testo}</div>${evento ? `<button class="btn pri" id="installa-si">Installa</button>` : ""}
    <button class="tondo" id="installa-no" aria-label="Chiudi">✕</button>`;
  document.body.append(d);
  d.querySelector("#installa-si")?.addEventListener("click", async () => {
    const e = evento; evento = null;
    e.prompt(); await e.userChoice; striscia();
  });
  d.querySelector("#installa-no").addEventListener("click", () => {
    try { sessionStorage.setItem("fit-installa-chiusa", "1"); } catch { /* niente memoria: si chiude solo ora */ }
    d.remove();
  });
}
addEventListener("beforeinstallprompt", e => { e.preventDefault(); evento = e; striscia(); });
addEventListener("appinstalled", () => { evento = null; document.getElementById("installa")?.remove(); });
setTimeout(striscia, 2500);     // se Chrome non ha offerto l'installazione entro 2,5 s, mostra le istruzioni
