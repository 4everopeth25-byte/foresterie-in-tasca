/* Foresterie in tasca: calcoli. Nessun accesso alla pagina, provati con node --test. */
const GIORNO = 86400000;

export function dataDaIso(iso){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
export function isoDaData(d){
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function aggiungiGiorni(iso, n){
  const d = dataDaIso(iso); d.setDate(d.getDate() + n); return isoDaData(d);
}
export function notti(dal, al){
  return Math.round((dataDaIso(al) - dataDaIso(dal)) / GIORNO);
}
/* due soggiorni hanno notti in comune; le date ISO si confrontano come testo */
export function sovrappone(a1, a2, b1, b2){ return a1 < b2 && b1 < a2; }

export function freschezza(generato, adesso){
  const giorni = notti(String(generato).slice(0, 10), String(adesso).slice(0, 10));
  return { giorni, livello: giorni <= 2 ? "verde" : giorni <= 6 ? "arancio" : "rosso" };
}
export function promemoria(arrivo, partenza, oggi){
  if (arrivo === oggi) return "Arriva oggi";
  if (arrivo === aggiungiGiorni(oggi, 1)) return "Arriva domani";
  if (partenza === oggi) return "Parte oggi";
  if (arrivo < oggi && partenza > oggi) return "In casa";
  return "";
}
export function validaCalendario(o){
  if (!o || typeof o !== "object") return "Il file non è leggibile.";
  if (o.tipo !== "foresterie-telefono")
    return "Questo non è il calendario per il telefono. Crealo sul PC dall'app d'ufficio: «Controlli e copie», «Esporta per telefono».";
  if (o.versione !== 1) return `Versione del file ${o.versione} non supportata: aggiorna l'app sul telefono.`;
  if (!o.generato || !Array.isArray(o.strutture) || !Array.isArray(o.prenotazioni)) return "Il file è incompleto: esportalo di nuovo dal PC.";
  return "";
}
export function stampo(adesso){
  return adesso.slice(0, 10) + "_" + adesso.slice(11, 13) + adesso.slice(14, 16);
}

const norm = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function occupazioni(cal, blocchi){
  return [...cal.prenotazioni, ...blocchi.map(b => ({ struttura: b.struttura, camera: b.camera, arrivo: b.dal, partenza: b.al,
    etichetta: b.etichetta, ospiti: 0, stato: "bloccata", id: b.id }))];
}
export function urti(occ, struttura, camera, dal, al){
  return occ.filter(o => o.struttura === struttura && o.camera === camera && sovrappone(dal, al, o.arrivo, o.partenza))
    .sort((a, b) => a.arrivo < b.arrivo ? -1 : 1);
}
export function camereLibere(cal, blocchi, dal, al, ospiti){
  const occ = occupazioni(cal, blocchi);
  return cal.strutture.map(s => {
    const adatte = [], strette = [];
    for (const c of s.camere){
      if (!c.inUso || urti(occ, s.nome, c.nome, dal, al).length) continue;
      const cam = { ...c, posti: c.posti || 1 };
      (cam.posti >= ospiti ? adatte : strette).push(cam);
    }
    return { struttura: s.nome, adatte, strette };
  });
}
export function situazioneOggi(cal, blocchi, struttura, oggi){
  const s = cal.strutture.find(x => x.nome === struttura);
  const occ = occupazioni(cal, blocchi).filter(o => o.struttura === struttura && o.stato !== "bloccata");
  const domani = aggiungiGiorni(oggi, 1);
  const inUso = s ? s.camere.filter(c => c.inUso) : [];
  const libere = inUso.filter(c => !occ.some(o => o.camera === c.nome && sovrappone(oggi, domani, o.arrivo, o.partenza))).map(c => c.nome);
  return { totale: inUso.length, occupate: inUso.length - libere.length, libere,
    arrivi: occ.filter(o => o.arrivo === oggi).length, partenze: occ.filter(o => o.partenza === oggi).length };
}
export function cercaCognome(cal, testo){
  const t = norm(testo).trim();
  if (t.length < 2) return [];
  return cal.prenotazioni.filter(p => norm(p.etichetta).includes(t)).sort((a, b) => a.arrivo < b.arrivo ? -1 : 1);
}

export function nuovoId(casuale = Math.random){
  return "b-" + Math.floor(casuale() * 0x1000000).toString(16).padStart(6, "0");
}
export function creaBlocco(dati, cal, blocchi, adesso, id){
  const { struttura, camera, dal, al } = dati;
  const etichetta = String(dati.etichetta || "").trim();
  if (!struttura || !camera) return { errore: "Scegli la struttura e la camera." };
  if (!dataDaIso(dal) || !dataDaIso(al)) return { errore: "Scegli il giorno di arrivo e quello di partenza." };
  if (dal < adesso.slice(0, 10)) return { errore: "Non si possono bloccare date passate." };
  if (al <= dal) return { errore: "La partenza deve essere dopo l'arrivo." };
  if (!etichetta) return { errore: "Scrivi per chi o perché blocchi la camera." };
  if (etichetta.length > 60) return { errore: "L'etichetta può avere al massimo 60 caratteri." };
  const s = cal.strutture.find(x => x.nome === struttura);
  const c = s && s.camere.find(x => x.nome === camera);
  if (!c) return { errore: "Camera non trovata nel calendario." };
  if (!c.inUso) return { errore: `${camera} è fuori uso.` };
  const u = urti(occupazioni(cal, blocchi), struttura, camera, dal, al);
  if (u.length) return { errore: `${camera} è occupata: ${u[0].etichetta}, dal ${u[0].arrivo} al ${u[0].partenza}.` };
  return { blocco: { id, struttura, camera, dal, al, etichetta, creato: adesso, stato: "da-inviare", inviato: null } };
}
export function fileBlocchi(blocchi, adesso){
  const da = blocchi.filter(b => b.stato === "da-inviare");
  const contenuto = { tipo: "foresterie-blocchi", versione: 1, generato: adesso,
    blocchi: da.map(({ id, struttura, camera, dal, al, etichetta, creato }) => ({ id, struttura, camera, dal, al, etichetta, creato })) };
  return { nome: `Blocchi dal telefono ${stampo(adesso)}.json`, testo: JSON.stringify(contenuto, null, 2), ids: da.map(b => b.id) };
}
export function segnaInviati(blocchi, ids, adesso){
  return blocchi.map(b => ids.includes(b.id) ? { ...b, stato: "inviato", inviato: adesso } : b);
}
export function riconcilia(blocchi, cal){
  const ricevuti = new Set(cal.blocchiRicevuti || []);
  const restano = blocchi.filter(b => !ricevuti.has(b.id) && !cal.prenotazioni.some(p =>
    p.struttura === b.struttura && p.camera === b.camera && p.arrivo === b.dal && p.partenza === b.al));
  return { restano, ricevuti: blocchi.length - restano.length };
}
export function daRicordare(blocchi, adesso){
  return blocchi.filter(b => b.stato === "da-inviare" && notti(b.creato.slice(0, 10), adesso.slice(0, 10)) >= 2).length;
}
