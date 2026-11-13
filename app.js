import * as L from "./logica.js";
import * as M from "./memoria.js";

/* ---------- stato ---------- */
const S = {
  cal: null, blocchi: [], tema: null,
  vista: "cal",                 // cal | libere | invia
  struttura: null, inizio: null, sel: null,
  foglio: null,                 // null | {tipo:"dett", i} | {tipo:"cerca", testo} | {tipo:"blocca", ...}
  libere: null, anima: true, vis: []
};
const N_GIORNI = 16;
const GG = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

/* ---------- utilità ---------- */
const E = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const adesso = () => { const d = new Date(); return L.isoDaData(d) + "T" + d.toTimeString().slice(0, 8); };
const oggi = () => adesso().slice(0, 10);
const dataBreve = iso => { const d = L.dataDaIso(iso); return `${GG[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()].slice(0, 3)}`; };
const ICO = {
  cal: '<rect x="3" y="4.5" width="18" height="16" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  letto: '<path d="M3 18v-6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v6M3 15h18M3 18v2M21 18v2M7 9V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3"/>',
  invia: '<path d="M12 15V3M7 8l5-5 5 5M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/>',
  luna: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  sole: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  lente: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  sx: '<path d="m15 18-6-6 6-6"/>', dx: '<path d="m9 18 6-6-6-6"/>',
  piu: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
  ok: '<path d="M20 6 9 17l-5-5"/>', ora: '<path d="M12 7v5l3 2"/>', orologio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  puntina: '<path d="M12 17v4M8 3h8l-1 7 3 3H6l3-3z"/>',
  persone: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  persona: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8"/>',
  lucchetto: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  cestino: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  scarica: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>', ricarica: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>',
  entra: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>',
  esce: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  avviso: '<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>'
};
const ico = (k, stile = "") => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"${stile ? ` style="${stile}"` : ""}>${ICO[k]}</svg>`;

let timerAvviso;
function avvisa(testo){
  const t = document.getElementById("toast");
  t.textContent = testo; t.classList.add("su");
  clearTimeout(timerAvviso); timerAvviso = setTimeout(() => t.classList.remove("su"), 4000);
}
function apriFile(accept){
  return new Promise(ok => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = accept;
    inp.onchange = () => ok(inp.files && inp.files[0] || null);
    inp.click();
  });
}
function scarica(nome, testo){
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([testo], { type: "application/json" }));
  a.download = nome; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/* ---------- tema ---------- */
const scuroSistema = matchMedia("(prefers-color-scheme: dark)");
function applicaTema(){ document.body.dataset.tema = S.tema || (scuroSistema.matches ? "scuro" : "chiaro"); }
scuroSistema.addEventListener("change", applicaTema);

/* ---------- caricamento del calendario ---------- */
async function caricaCalendario(){
  const f = await apriFile(".json,application/json");
  if (!f) return;
  let o;
  try { o = JSON.parse(await f.text()); } catch { return avvisa(`«${f.name}» non è un file leggibile.`); }
  const errore = L.validaCalendario(o);
  if (errore) return avvisa(errore);
  const { restano, ricevuti } = L.riconcilia(S.blocchi, o);
  S.cal = o; S.blocchi = restano;
  if (!S.cal.strutture.some(s => s.nome === S.struttura)) S.struttura = S.cal.strutture[0]?.nome || null;
  await M.scrivi("calendario", S.cal); await M.scrivi("blocchi", S.blocchi);
  S.anima = true; S.vista = "cal"; S.foglio = null; disegna();
  const n = o.prenotazioni.length;
  avvisa(`Calendario caricato: ${n} ${n === 1 ? "soggiorno" : "soggiorni"}.` +
    (ricevuti ? ` ${ricevuti} ${ricevuti === 1 ? "blocco ricevuto" : "blocchi ricevuti"} in ufficio, tolti da «Da inviare».` : ""));
}

/* ---------- schermate (riempite più sotto) ---------- */
const VISTE = {};
const FOGLI = {};
function navigazione(){
  const n = S.blocchi.filter(b => b.stato === "da-inviare").length;
  const voce = (v, icona, testo, badge = "") =>
    `<button class="voce${S.vista === v ? " on" : ""}" data-az="vista" data-v="${v}"${S.vista === v ? ' aria-current="page"' : ""}>${badge}<span class="pill">${ico(icona)}</span>${testo}</button>`;
  return `<nav class="basso">${voce("cal", "cal", "Calendario")}${voce("libere", "letto", "Camere libere")}${
    voce("invia", "invia", "Da inviare", n ? `<span class="badge">${n}</span>` : "")}</nav>`;
}
function schermataVuota(){
  return `<div class="vuoto">
    <h2>Foresterie in tasca</h2>
    <p>Per vedere il calendario serve il file preparato dall'app d'ufficio.</p>
    <ol><li>Sul PC: «Controlli e copie», «Esporta per telefono».</li>
      <li>Copia il file sul telefono, con il cavo o una chiavetta.</li>
      <li>Qui sotto: «Carica il calendario» e scegli il file.</li></ol>
    <button class="btn pri" data-az="carica">${ico("ricarica")}Carica il calendario</button></div>`;
}
function disegna(){
  const app = document.getElementById("app");
  if (!S.cal){ app.innerHTML = schermataVuota(); return; }
  app.innerHTML = (VISTE[S.vista] || VISTE.cal)() + navigazione() + (S.foglio ? FOGLI[S.foglio.tipo]() : "");
  S.anima = false;
  /* la barra scelta (dalla ricerca o appena bloccata) va portata in vista */
  const sel = app.querySelector(".barra.sel"), scorri = app.querySelector(".scorri");
  if (sel && scorri) scorri.scrollLeft = Math.max(0, sel.offsetLeft - 92 - 24);
}

/* ---------- azioni ---------- */
const AZ = {
  carica: caricaCalendario,
  vista: d => { S.vista = d.v; S.foglio = null; if (d.v === "cal") S.anima = true; disegna(); },
  tema: async () => {
    S.tema = document.body.dataset.tema === "scuro" ? "chiaro" : "scuro";
    await M.scrivi("tema", S.tema); applicaTema(); disegna();
  },
  chiudi: () => { S.foglio = null; disegna(); },
  velo: () => { S.foglio = null; disegna(); }
};
document.addEventListener("click", e => {
  const t = e.target.closest("[data-az]");
  if (!t || t.disabled) return;
  const f = AZ[t.dataset.az];
  if (f) f(t.dataset, t, e);
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && S.foglio){ S.foglio = null; disegna(); } });

/* ================= CALENDARIO ================= */
const CW = 50, RW = 92, RH = 56, HH = 52;
const iconaTema = () => ico(document.body.dataset.tema === "scuro" ? "sole" : "luna");
function testataCalendario(){
  const f = L.freschezza(S.cal.generato, adesso());
  const quando = f.giorni === 0 ? `di oggi, ${S.cal.generato.slice(11, 16)}` : f.giorni === 1 ? "di ieri" : `di ${f.giorni} giorni fa`;
  const ric = L.daRicordare(S.blocchi, adesso());
  const sit = L.situazioneOggi(S.cal, S.blocchi, S.struttura, oggi());
  const p = sit.totale ? Math.round(sit.occupate / sit.totale * 100) : 0;
  const libere = sit.libere.length ? `Libere: ${sit.libere.join(", ")}` : "Nessuna camera libera oggi";
  const fine = L.aggiungiGiorni(S.inizio, N_GIORNI - 1), d1 = L.dataDaIso(S.inizio), d2 = L.dataDaIso(fine);
  const periodo = d1.getMonth() === d2.getMonth() ? `${d1.getDate()} – ${d2.getDate()} ${MESI[d2.getMonth()]}`
    : `${d1.getDate()} ${MESI[d1.getMonth()].slice(0, 3)} – ${d2.getDate()} ${MESI[d2.getMonth()].slice(0, 3)}`;
  return `<div class="testa">
    <div class="riga1"><div><h2>Calendario</h2>
      <div class="fresco ${f.livello}"><span class="pt"></span>Dati dell'ufficio ${quando}${f.livello === "rosso" ? ": carica quelli nuovi" : ""}</div></div>
      <span class="azioni">
        <button class="tondo" data-az="tema" aria-label="Cambia tema">${iconaTema()}</button>
        <button class="tondo" data-az="cerca" aria-label="Cerca un cognome">${ico("lente")}</button></span></div>
    ${ric ? `<button class="ricorda" data-az="vista" data-v="invia">${ico("avviso", "width:16px;height:16px")}${ric} ${ric === 1 ? "blocco aspetta" : "blocchi aspettano"} di essere inviati in ufficio</button>` : ""}
    <div class="strutture" role="tablist" style="grid-template-columns:repeat(${S.cal.strutture.length},1fr)">${S.cal.strutture.map(s =>
      `<button role="tab" class="${s.nome === S.struttura ? "on" : ""}" aria-selected="${s.nome === S.struttura}" data-az="struttura" data-s="${E(s.nome)}">${E(s.nome)}</button>`).join("")}</div>
    <div class="oggi-st">
      <span class="anello" style="--p:${p}"><b>${sit.occupate}/${sit.totale}</b></span>
      <div class="tx"><b>${sit.occupate} ${sit.occupate === 1 ? "camera occupata" : "camere occupate"} oggi</b><span>${E(libere)}</span></div>
      <div class="mov"><span title="Arrivi oggi">${ico("entra", "width:14px;height:14px")}${sit.arrivi}</span>
        <span class="part" title="Partenze oggi">${ico("esce", "width:14px;height:14px")}${sit.partenze}</span></div>
    </div>
    <div class="mese"><b>${periodo}</b>
      <span class="nav"><button class="tondo" data-az="sposta" data-n="-7" aria-label="Settimana prima">${ico("sx")}</button>
      <button class="oggi" data-az="oggi">Oggi</button>
      <button class="tondo" data-az="sposta" data-n="7" aria-label="Settimana dopo">${ico("dx")}</button></span></div>
    <div class="legenda">
      <span><i class="lc">${ico("ok")}</i>Confermata</span><span><i class="la">${ico("ora")}</i>Da confermare</span><span><i class="lb">${ico("puntina")}</i>Bloccata</span>
    </div></div>`;
}
function griglia(){
  const s = S.cal.strutture.find(x => x.nome === S.struttura);
  const fine = L.aggiungiGiorni(S.inizio, N_GIORNI), oggiIso = oggi();
  const giorni = Array.from({ length: N_GIORNI }, (_, i) => L.aggiungiGiorni(S.inizio, i));
  const feste = new Map((S.cal.festivita || []).map(f => [f.data, f.descrizione]));
  const idx = iso => L.notti(S.inizio, iso);
  let h = `<div class="angolo">Camera</div>`;
  for (const g of giorni){
    const d = L.dataDaIso(g), we = d.getDay() % 6 === 0;
    h += `<div class="gg${we ? " we" : ""}${g === oggiIso ? " oggi" : ""}${feste.has(g) ? " fest" : ""}"${feste.has(g) ? ` title="${E(feste.get(g))}"` : ""}>
      <span>${g === oggiIso ? "oggi" : GG[d.getDay()]}</span><b>${d.getDate()}</b></div>`;
  }
  const libereOggi = new Set(L.situazioneOggi(S.cal, S.blocchi, S.struttura, oggiIso).libere);
  s.camere.forEach(c => {
    const lib = c.inUso && libereOggi.has(c.nome);
    h += `<div class="cam${c.inUso ? "" : " fuori"}"><b>${E(c.nome)}</b><span><i class="${lib ? "lib" : ""}"></i>${
      c.inUso ? `${c.posti || 1} ${(c.posti || 1) === 1 ? "posto" : "posti"}` : "fuori uso"}</span></div>`;
    for (const g of giorni){
      const d = L.dataDaIso(g);
      h += `<div class="cella${d.getDay() % 6 === 0 ? " we" : ""}${g === oggiIso ? " oggi" : ""}${c.inUso ? "" : " fuori"}"></div>`;
    }
  });
  const iOggi = idx(oggiIso);
  if (iOggi >= 0 && iOggi < N_GIORNI) h += `<div class="raggio" style="left:${RW + (iOggi + .5) * CW}px"></div>`;
  S.vis = L.occupazioni(S.cal, S.blocchi).filter(o => o.struttura === S.struttura && L.sovrappone(S.inizio, fine, o.arrivo, o.partenza));
  const SIMB = { confermata: "ok", "da-confermare": "ora", bloccata: "puntina" };
  const CL = { confermata: "conf", "da-confermare": "att", bloccata: "blk" };
  S.vis.forEach((o, i) => {
    const r = s.camere.findIndex(c => c.nome === o.camera);
    if (r < 0) return;
    let x1 = RW + (idx(o.arrivo) + .5) * CW + 3, x2 = RW + (idx(o.partenza) + .5) * CW - 3, cl = "";
    if (o.arrivo < S.inizio){ x1 = RW + 2; cl += " ts"; }
    if (o.partenza > L.aggiungiGiorni(S.inizio, N_GIORNI - 1)){ x2 = RW + N_GIORNI * CW; cl += " te"; }
    const w = x2 - x1, corta = w < 110;
    const nome = corta ? o.etichetta.split(" ").slice(-1)[0] : o.etichetta;
    const sotto = o.stato === "bloccata" ? "bloccata da te" : `${ico("persona")}${o.ospiti} ${o.ospiti === 1 ? "ospite" : "ospiti"}`;
    const chiave = `${o.camera}|${o.arrivo}`;
    h += `<button class="barra ${CL[o.stato]}${cl}${corta ? " corta" : ""}${S.sel === chiave ? " sel" : ""}" style="left:${x1}px;top:${HH + r * RH + (RH - 42) / 2}px;width:${w}px;--k:${i}"
      data-az="dett" data-i="${i}" aria-label="${E(o.etichetta)}, ${E(o.camera)}, dal ${dataBreve(o.arrivo)} al ${dataBreve(o.partenza)}">
      <span class="txt"><b>${E(nome)}</b><small>${sotto}</small></span><span class="st">${ico(SIMB[o.stato])}</span></button>`;
  });
  return `<div class="foglio"><div class="scorri"><div class="griglia${S.anima ? " anima" : ""}" style="--n:${N_GIORNI}">${h}</div></div></div>`;
}
VISTE.cal = () => testataCalendario() + griglia() +
  `<button class="fab" data-az="blocca">${ico("piu")}Blocca camera</button>`;

/* ================= DETTAGLIO ================= */
FOGLI.dett = () => {
  const o = S.vis[S.foglio.i];
  const s = S.cal.strutture.find(x => x.nome === o.struttura), c = s?.camere.find(x => x.nome === o.camera);
  const STATO = { confermata: ["ok", "Confermata", "dom"], "da-confermare": ["orologio", "Da confermare", "att"], bloccata: ["puntina", "Bloccata da te, da inviare in ufficio", "dom"] };
  const [ic, testo, cl] = STATO[o.stato];
  const pro = L.promemoria(o.arrivo, o.partenza, oggi()), n = L.notti(o.arrivo, o.partenza);
  return `<div class="velo" data-az="velo"></div>
  <div class="sheet" role="dialog" aria-modal="true" aria-label="${E(o.etichetta)}">
    <div class="maniglia"></div>
    <h3>${E(o.etichetta)}</h3><p class="sotto">${E(o.struttura)}, camera ${E(o.camera)}</p>
    <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
      <span class="etich ${cl}">${ico(ic, "width:14px;height:14px")}${testo}</span>${pro ? `<span class="etich dom">${pro}</span>` : ""}</div>
    <div class="date2"><div><span>Arrivo</span><b>${dataBreve(o.arrivo)}</b></div><div><span>Partenza</span><b>${dataBreve(o.partenza)}</b></div>
      <span class="notti">${n} ${n === 1 ? "notte" : "notti"}</span></div>
    <div class="righe">
      ${o.stato !== "bloccata" ? `<div><span>${ico("persone", "width:18px;height:18px")}Ospiti</span><b>${o.ospiti} ${o.ospiti === 1 ? "persona" : "persone"}</b></div>` : ""}
      <div><span>${ico("letto", "width:18px;height:18px")}Camera</span><b>${E(c?.tipologia || "")}${c ? `, ${c.posti || 1} ${(c.posti || 1) === 1 ? "posto" : "posti"}` : ""}</b></div></div>
    <p class="nota">${ico("lucchetto", "width:18px;height:18px")}Telefono, e-mail, importi e documenti restano sul PC dell'ufficio.</p>
    <div style="height:16px"></div><button class="btn sec" data-az="chiudi">Chiudi</button></div>`;
};

/* ================= RICERCA ================= */
FOGLI.cerca = () => `<div class="velo" data-az="velo"></div>
  <div class="sheet" style="top:40px" role="dialog" aria-modal="true" aria-label="Cerca un cognome">
    <div class="maniglia"></div>
    <div style="display:flex;justify-content:space-between;align-items:center"><h3>Cerca un cognome</h3>
      <button class="tondo" data-az="chiudi" aria-label="Chiudi">${ico("x")}</button></div>
    <p class="campo-et">Almeno due lettere</p>
    <input class="input" id="cerca-testo" type="search" autocomplete="off" value="${E(S.foglio.testo || "")}" placeholder="Es. Marini">
    <div class="risultati" id="cerca-esito">${risultatiRicerca()}</div></div>`;
function risultatiRicerca(){
  const testo = (S.foglio.testo || "").trim();
  if (testo.length < 2) return "";
  const r = L.cercaCognome(S.cal, testo);
  if (!r.length) return `<p class="sotto" style="padding:12px 4px">Nessun soggiorno trovato.</p>`;
  return r.map((p, i) => `<button data-az="vaiA" data-i="${i}"><b>${E(p.etichetta)}</b>
    <span>${E(p.struttura)}, ${E(p.camera)}: ${dataBreve(p.arrivo)} → ${dataBreve(p.partenza)}</span></button>`).join("");
}
document.addEventListener("input", e => {
  if (e.target.id !== "cerca-testo") return;
  S.foglio.testo = e.target.value;
  document.getElementById("cerca-esito").innerHTML = risultatiRicerca();
});

Object.assign(AZ, {
  struttura: d => { S.struttura = d.s; S.sel = null; S.anima = true; disegna(); },
  sposta: d => { S.inizio = L.aggiungiGiorni(S.inizio, +d.n); S.anima = true; disegna(); },
  oggi: () => { S.inizio = oggi(); S.anima = true; disegna(); },
  dett: d => { S.foglio = { tipo: "dett", i: +d.i }; disegna(); },
  cerca: () => { S.foglio = { tipo: "cerca", testo: "" }; disegna(); document.getElementById("cerca-testo").focus(); },
  vaiA: d => {
    const p = L.cercaCognome(S.cal, S.foglio.testo.trim())[+d.i];
    S.struttura = p.struttura; S.vista = "cal"; S.foglio = null;
    S.inizio = p.partenza > oggi() && p.arrivo <= oggi() ? oggi() : L.aggiungiGiorni(p.arrivo, -1);
    S.sel = `${p.camera}|${p.arrivo}`; S.anima = true; disegna();
  }
});

/* ================= BLOCCA CAMERA ================= */
function nuovoStatoBlocco(pre = {}){
  return { tipo: "blocca", struttura: pre.struttura || S.struttura, mese: (pre.dal || oggi()).slice(0, 7),
    dal: pre.dal || null, al: pre.al || null, camera: pre.camera || null, etichetta: "" };
}
function miniCalendario(b){
  const [a, m] = b.mese.split("-").map(Number), primo = new Date(a, m - 1, 1);
  const vuoti = (primo.getDay() + 6) % 7, giorniMese = new Date(a, m, 0).getDate(), oggiIso = oggi();
  let h = ["lu", "ma", "me", "gi", "ve", "sa", "do"].map(x => `<span class="h">${x}</span>`).join("") + "<span></span>".repeat(vuoti);
  for (let g = 1; g <= giorniMese; g++){
    const iso = `${b.mese}-${String(g).padStart(2, "0")}`;
    let cl = iso === oggiIso ? "t" : "";
    if (b.dal && iso === b.dal) cl = "a";
    if (b.al && iso === b.al) cl = "b";
    if (b.dal && b.al && iso > b.dal && iso < b.al) cl = "in";
    h += `<button class="${cl}" data-az="bGiorno" data-g="${iso}"${iso < oggiIso ? " disabled" : ""} aria-label="${g} ${MESI[m - 1]}">${g}</button>`;
  }
  const passato = b.mese <= oggi().slice(0, 7);
  return `<div class="mini"><div class="tm">
    <button class="tondo" style="width:32px;height:32px" data-az="bMese" data-n="-1" aria-label="Mese prima"${passato ? " disabled" : ""}>${ico("sx")}</button>${MESI[m - 1][0].toUpperCase() + MESI[m - 1].slice(1)} ${a}
    <button class="tondo" style="width:32px;height:32px" data-az="bMese" data-n="1" aria-label="Mese dopo">${ico("dx")}</button></div>
    <div class="g7">${h}</div></div>`;
}
FOGLI.blocca = () => {
  const b = S.foglio, s = S.cal.strutture.find(x => x.nome === b.struttura);
  const occ = L.occupazioni(S.cal, S.blocchi), date = b.dal && b.al;
  const libera = c => c.inUso && (!date || !L.urti(occ, b.struttura, c.nome, b.dal, b.al).length);
  const nLib = date ? s.camere.filter(libera).length : null;
  const chips = [...s.camere].sort((x, y) => libera(y) - libera(x)).map(c => {
    const ok = libera(c);
    return `<button class="ch${b.camera === c.nome ? " on" : ""}${ok ? "" : " no"}" data-az="bCamera" data-c="${E(c.nome)}"${ok ? "" : " disabled"}>${
      b.camera === c.nome ? ico("ok") : ""}${ok ? E(c.nome) : `<s>${E(c.nome)}</s>`}</button>`;
  }).join("");
  let esito = `<div class="esito neutro">Scegli arrivo e partenza sul calendario, poi la camera.</div>`;
  if (date && b.camera){
    const u = L.urti(occ, b.struttura, b.camera, b.dal, b.al), n = L.notti(b.dal, b.al);
    esito = u.length ? `<div class="esito ko"><span class="ico">${ico("x")}</span><span><b>${E(b.camera)} è occupata</b>: ${E(u[0].etichetta)}.</span></div>`
      : `<div class="esito"><span class="ico">${ico("ok")}</span><span><b>${E(b.camera)} è libera</b> per ${n === 1 ? "la notte scelta" : `tutte e ${n} le notti`}.</span></div>`;
  } else if (date) esito = `<div class="esito neutro">Ora scegli una camera libera.</div>`;
  else if (b.dal) esito = `<div class="esito neutro">Ora tocca il giorno di partenza.</div>`;
  const pronto = date && b.camera;
  return `<div class="velo" data-az="velo"></div>
  <div class="sheet" style="top:40px;padding-top:4px;overflow:auto;scrollbar-width:none" role="dialog" aria-modal="true" aria-label="Blocca una camera">
    <div class="maniglia"></div>
    <div style="display:flex;justify-content:space-between;align-items:center"><h3>Blocca una camera</h3>
      <button class="tondo" data-az="chiudi" aria-label="Chiudi">${ico("x")}</button></div>
    <p class="campo-et">1. Struttura</p>
    <div class="seg4" style="grid-template-columns:repeat(${S.cal.strutture.length},1fr)">${S.cal.strutture.map(x =>
      `<button class="${x.nome === b.struttura ? "on" : ""}" data-az="bStruttura" data-s="${E(x.nome)}">${E(x.nome)}</button>`).join("")}</div>
    <p class="campo-et">2. Date <em>${date ? `${dataBreve(b.dal)} → ${dataBreve(b.al)}, ${L.notti(b.dal, b.al)} ${L.notti(b.dal, b.al) === 1 ? "notte" : "notti"}` : b.dal ? "ora la partenza" : "arrivo e partenza"}</em></p>
    ${miniCalendario(b)}
    <p class="campo-et">3. Camera <em>${nLib === null ? "" : `${nLib} ${nLib === 1 ? "libera" : "libere"} su ${s.camere.length}`}</em></p>
    <div class="scelte">${chips}</div>
    ${esito}
    <p class="campo-et">4. Per chi o perché</p>
    <input class="input" id="b-etichetta" maxlength="60" autocomplete="off" placeholder="Es. Opzione Rossi, attesa conferma" value="${E(b.etichetta)}">
    <div style="height:84px"></div>
    <div style="position:sticky;bottom:-28px;margin:0 -20px -28px;padding:12px 20px 28px;background:var(--surf-pieno);border-top:1px solid var(--line)">
      <button class="btn pri" data-az="bSalva"${pronto ? "" : ' disabled style="opacity:.5"'}>${ico("puntina")}${pronto ? `Blocca ${E(b.camera)}` : "Blocca camera"}</button></div></div>`;
};
document.addEventListener("input", e => { if (e.target.id === "b-etichetta") S.foglio.etichetta = e.target.value; });
function ridisegnaFoglio(){
  const sheet = document.querySelector(".sheet"), su = sheet ? sheet.scrollTop : 0;
  disegna();
  const nuovo = document.querySelector(".sheet"); if (nuovo) nuovo.scrollTop = su;
}

Object.assign(AZ, {
  blocca: () => { S.foglio = nuovoStatoBlocco(); disegna(); },
  bStruttura: d => { Object.assign(S.foglio, { struttura: d.s, camera: null }); ridisegnaFoglio(); },
  bMese: d => {
    const [a, m] = S.foglio.mese.split("-").map(Number), x = new Date(a, m - 1 + +d.n, 1);
    S.foglio.mese = L.isoDaData(x).slice(0, 7); ridisegnaFoglio();
  },
  bGiorno: d => {
    const b = S.foglio, g = d.g;
    if (!b.dal || b.al || g <= b.dal){ b.dal = g; b.al = null; } else b.al = g;
    b.camera = null; ridisegnaFoglio();
  },
  bCamera: d => { S.foglio.camera = d.c; ridisegnaFoglio(); },
  bSalva: async () => {
    const b = S.foglio;
    const r = L.creaBlocco(b, S.cal, S.blocchi, adesso(), L.nuovoId());
    if (r.errore) return avvisa(r.errore);
    S.blocchi = [...S.blocchi, r.blocco];
    await M.scrivi("blocchi", S.blocchi);
    S.struttura = b.struttura; S.vista = "cal"; S.foglio = null;
    if (b.dal < S.inizio || b.dal >= L.aggiungiGiorni(S.inizio, N_GIORNI)){
      const prima = L.aggiungiGiorni(b.dal, -1); S.inizio = prima < oggi() ? oggi() : prima;
    }
    S.sel = `${b.camera}|${b.dal}`; disegna();
    avvisa(`${b.camera} bloccata. Ricorda di inviarla in ufficio da «Da inviare».`);
  }
});

/* ================= CAMERE LIBERE ================= */
VISTE.libere = () => {
  S.libere ??= { dal: oggi(), al: L.aggiungiGiorni(oggi(), 2), ospiti: 2 };
  const q = S.libere, valide = q.dal >= oggi() && q.al > q.dal;
  const gruppi = valide ? L.camereLibere(S.cal, S.blocchi, q.dal, q.al, q.ospiti) : [];
  const riga = (c, st) => `<div><span class="ic">${ico("letto")}</span><div class="tx"><b>${E(c.nome)}</b><span>${E(c.tipologia)}, ${c.posti} ${c.posti === 1 ? "posto" : "posti"}</span></div>
    <button data-az="lBlocca" data-s="${E(st)}" data-c="${E(c.nome)}">Blocca</button></div>`;
  const stretta = c => `<div class="stretta"><span class="ic">${ico("letto")}</span><div class="tx"><b>${E(c.nome)}</b><span>Libera, ma solo ${c.posti} ${c.posti === 1 ? "posto" : "posti"}</span></div></div>`;
  const corpo = !valide ? `<p class="spiega">La partenza deve essere dopo l'arrivo, e l'arrivo non prima di oggi.</p>`
    : gruppi.map(g => `<div class="gruppo">${E(g.struttura)}${g.adatte.length ? `<span>${g.adatte.length} ${g.adatte.length === 1 ? "adatta" : "adatte"}</span>` : `<span style="color:var(--ink-3)">nessuna adatta</span>`}</div>
      ${g.adatte.length || g.strette.length ? `<div class="lista">${g.adatte.map(c => riga(c, g.struttura)).join("")}${g.strette.map(stretta).join("")}</div>` : ""}`).join("");
  return `<div class="testa"><div class="riga1"><h2>Camere libere</h2>
      <button class="tondo" data-az="tema" aria-label="Cambia tema">${iconaTema()}</button></div></div>
    <div class="corpo">
      <div class="cerca">
        <label class="box"><span>Arrivo</span><input type="date" id="l-dal" value="${q.dal}" min="${oggi()}"></label>
        <label class="box"><span>Partenza</span><input type="date" id="l-al" value="${q.al}" min="${L.aggiungiGiorni(q.dal, 1)}"></label>
        <div class="box largo"><div><span>Ospiti</span><b>${q.ospiti} ${q.ospiti === 1 ? "persona" : "persone"}</b></div>
          <div class="passo"><button class="tondo" style="border:1px solid var(--line-forte);color:var(--accent)" data-az="lOspiti" data-n="-1" aria-label="Meno ospiti"${q.ospiti <= 1 ? " disabled" : ""}>−</button>
          <button class="tondo" style="border:1px solid var(--line-forte);color:var(--accent)" data-az="lOspiti" data-n="1" aria-label="Più ospiti">+</button></div></div>
      </div>${corpo}</div>`;
};
document.addEventListener("change", e => {
  if (e.target.id === "l-dal"){ S.libere.dal = e.target.value; if (S.libere.al <= S.libere.dal) S.libere.al = L.aggiungiGiorni(S.libere.dal, 1); disegna(); }
  if (e.target.id === "l-al"){ S.libere.al = e.target.value; disegna(); }
});
Object.assign(AZ, {
  lOspiti: d => { S.libere.ospiti = Math.max(1, S.libere.ospiti + +d.n); disegna(); },
  lBlocca: d => { S.foglio = nuovoStatoBlocco({ struttura: d.s, camera: d.c, dal: S.libere.dal, al: S.libere.al }); disegna(); }
});

/* ================= DA INVIARE ================= */
VISTE.invia = () => {
  const lista = [...S.blocchi].sort((a, b) => a.dal < b.dal ? -1 : 1);
  const daInviare = lista.filter(b => b.stato === "da-inviare").length;
  const esiste = b => S.cal.strutture.find(s => s.nome === b.struttura)?.camere.some(c => c.nome === b.camera);
  const carta = b => {
    const n = L.notti(b.dal, b.al);
    return `<div class="carta"><span class="bollo">${ico("puntina")}</span><div class="tx">
      <b>${E(b.struttura)}, ${E(b.camera)}</b><span>${dataBreve(b.dal)} → ${dataBreve(b.al)}, ${n} ${n === 1 ? "notte" : "notti"}</span>
      <em>${E(b.etichetta)}</em>
      <span class="stato-blocco${b.stato === "da-inviare" ? " da" : ""}">${b.stato === "da-inviare" ? "Da inviare" : `Inviato ${dataBreve(b.inviato.slice(0, 10))}, in attesa dell'ufficio`}${
        esiste(b) ? "" : ". Camera non trovata nel calendario"}</span></div>
      <button class="tondo" data-az="elimina" data-id="${b.id}" aria-label="Elimina il blocco di ${E(b.camera)}">${ico("cestino")}</button></div>`;
  };
  return `<div class="testa"><div class="riga1"><h2>Da inviare</h2>
      <button class="tondo" data-az="tema" aria-label="Cambia tema">${iconaTema()}</button></div></div>
    <div class="corpo">
      <p class="spiega">${lista.length ? "Questi blocchi sono salvati solo sul telefono. Esporta il file, copialo sul PC e aprilo con l'app d'ufficio, pagina «Richieste», «Blocchi dal telefono»."
        : "Nessun blocco. Quando blocchi una camera la trovi qui, pronta da inviare in ufficio."}</p>
      ${lista.map(carta).join("")}
      <p class="spiega" style="margin-top:14px;color:var(--ink-3)">Calendario dell'ufficio del ${dataBreve(S.cal.generato.slice(0, 10))}, ore ${S.cal.generato.slice(11, 16)}.</p>
    </div>
    <div class="piede">
      <button class="btn pri" data-az="esporta"${daInviare ? "" : ' disabled style="opacity:.5"'}>${ico("scarica")}Esporta per l'ufficio${daInviare ? ` (${daInviare})` : ""}</button>
      <button class="btn sec" data-az="carica">${ico("ricarica")}Carica calendario aggiornato</button></div>`;
};
Object.assign(AZ, {
  esporta: async () => {
    const f = L.fileBlocchi(S.blocchi, adesso());
    if (!f.ids.length) return avvisa("Non ci sono blocchi da inviare.");
    scarica(f.nome, f.testo);
    S.blocchi = L.segnaInviati(S.blocchi, f.ids, adesso());
    await M.scrivi("blocchi", S.blocchi); disegna();
    avvisa(`Creato «${f.nome}» nella cartella Download. Copialo sul PC.`);
  },
  elimina: async d => {
    const b = S.blocchi.find(x => x.id === d.id);
    if (!b || !confirm(`Eliminare il blocco di ${b.camera} dal ${dataBreve(b.dal)} al ${dataBreve(b.al)}?`)) return;
    S.blocchi = S.blocchi.filter(x => x.id !== d.id);
    await M.scrivi("blocchi", S.blocchi); disegna(); avvisa("Blocco eliminato.");
  }
});

/* ---------- avvio ---------- */
async function avvio(){
  S.cal = await M.leggi("calendario") || null;
  S.blocchi = await M.leggi("blocchi") || [];
  S.tema = await M.leggi("tema") || null;
  applicaTema();
  S.struttura = S.cal?.strutture[0]?.nome || null;
  S.inizio = oggi();
  M.chiediPersistenza();
  disegna();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
}
avvio();
