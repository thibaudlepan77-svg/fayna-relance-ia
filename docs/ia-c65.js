#!/usr/bin/env node
/**
 * Sonde de la couche IA de FAYNA (cycle 65) : garde-fou de sortie + appel robuste.
 *
 * Zero dependance, zero reseau : `fetch` est SIMULE, la pause de rejeu est instantanee.
 * On prouve, de facon deterministe et reproductible :
 *   A. le garde-fou refuse toute reecriture qui altere le fond du message (montants, dates,
 *      menaces, promesses, liens, signature, accents, wolof) et accepte une reformulation benigne ;
 *   B. l'appel reseau est robuste : delai maximal + abandon, un rejeu sur erreur transitoire,
 *      repli de modele, messages d'erreur explicites, cle jamais placee dans l'URL ;
 *   C. l'application reste utilisable SANS aucune cle (repli deterministe, ARCHITECTURE.md s4).
 *
 * Usage : node docs/ia-c65.js       (exit 0 si tout est vert)
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const E = (0, eval)(html.slice(html.indexOf("/*ENGINE_START*/"), html.indexOf("/*ENGINE_END*/")) + "\n;FAYNA_ENGINE");

const FINE = " ", NBSP = " ";
let pass = 0, fail = 0;
const fails = [];
function ok(cond, label) {
  if (cond) pass++;
  else { fail++; fails.push(label); }
}

/* =========================================================================
   A. GARDE-FOU DE SORTIE
   ========================================================================= */

const CTX = {
  nom: "Boutique Ndiaye", montant: 150000, echeance: "2026-05-22", relation: "habituel",
  expediteur: "Entreprise Diallo", canalPaiement: "Wave ou Orange Money", aujourdhui: "2026-07-09"
};
const G = E.genererMessage(CTX);
const BASE = G.fr + "\n\n" + G.wo;                    // niveau 3, bilingue
const O = { nom: CTX.nom, montant: CTX.montant, dateFr: G.dateFr, canal: CTX.canalPaiement, expediteur: CTX.expediteur };
const SIG = "\n" + CTX.expediteur;
const MONTANT = E.fmtMontant(CTX.montant);            // 150<fine>000<nbsp>FCFA
const CHIFFRES = "150" + FINE + "000";

ok(G.niveau === 3, "contexte d'essai : escalade de niveau 3 (mise en demeure amiable)");
ok(BASE.indexOf(MONTANT) !== -1 && BASE.indexOf("Salaam") !== -1, "message de base : montant formate + partie wolof");

// Insere une phrase juste avant la premiere signature (mutation toujours applicable).
function ajout(phrase) {
  const i = BASE.indexOf(SIG);
  return BASE.slice(0, i) + " " + phrase + BASE.slice(i);
}
function accepte(label, propose) {
  const r = E.verifierSortieIA(BASE, propose, O);
  ok(r.ok === true, "garde-fou ACCEPTE : " + label + (r.ok ? "" : " (refuse a tort : " + r.violations.map((v) => v.code).join(",") + ")"));
}
function refuse(label, propose, codeAttendu) {
  const r = E.verifierSortieIA(BASE, propose, O);
  const codes = r.violations.map((v) => v.code);
  ok(r.ok === false, "garde-fou REFUSE : " + label);
  if (codeAttendu) ok(codes.indexOf(codeAttendu) !== -1, "garde-fou motif « " + codeAttendu + " » : " + label + " (obtenu : " + codes.join(",") + ")");
}

/* --- A.1 ce qui doit passer (le garde-fou ne doit pas etre un mur) --- */
accepte("reecriture identique", BASE);
accepte("reformulation benigne", BASE.replace("Bonjour Boutique Ndiaye,", "Bonjour Boutique Ndiaye, j'espère que la boutique se porte bien."));
accepte("separateur de milliers en espace ordinaire", BASE.split(CHIFFRES).join("150 000"));
accepte("separateur de milliers en insecable", BASE.split(CHIFFRES).join("150" + NBSP + "000"));
accepte("montant sans separateur", BASE.split(CHIFFRES).join("150000"));

/* --- A.2 alteration du fond : montant, devise, date --- */
refuse("montant modifie", BASE.split(CHIFFRES).join("180" + FINE + "000"), "IA_NOMBRE_INVENTE");
refuse("montant supprime", BASE.split(MONTANT).join("la somme convenue"), "IA_MONTANT_ABSENT");
refuse("devise FCFA supprimee", BASE.split(MONTANT).join(CHIFFRES), "IA_MONTANT_ABSENT");
refuse("mois de l'echeance modifie", BASE.split("mai").join("juin"), "IA_DATE_ALTEREE");

/* --- A.3 chiffres inventes (delai, taux, penalite) --- */
refuse("delai invente", ajout("Payez sous 5 jours."), "IA_NOMBRE_INVENTE");
refuse("taux d'interet invente", ajout("Des intérêts de 10 % seront appliqués."), "IA_NOMBRE_INVENTE");

/* --- A.4 menaces, promesses, pression (le coeur de la promesse d'honnetete) --- */
refuse("menace : police", ajout("Sinon j'appelle la police."), "IA_LEXIQUE_INTERDIT");
refuse("menace : huissier", ajout("J'envoie l'huissier demain."), "IA_LEXIQUE_INTERDIT");
refuse("menace : tribunal", ajout("Je vous poursuis au tribunal."), "IA_LEXIQUE_INTERDIT");
refuse("menace : saisie", ajout("Je fais saisir votre marchandise."), "IA_LEXIQUE_INTERDIT");
refuse("menace : plainte penale", ajout("Je dépose une plainte pour escroquerie."), "IA_LEXIQUE_INTERDIT");
refuse("promesse de resultat", ajout("Je vous garantis un arrangement."), "IA_LEXIQUE_INTERDIT");
refuse("insulte", ajout("Vous devriez avoir honte."), "IA_LEXIQUE_INTERDIT");

/* --- A.5 hameconnage : lien ou contact insere (injection de consigne dans le prompt) --- */
refuse("lien de paiement insere", ajout("Payez ici https://wave-sn.example/x"), "IA_LIEN_OU_CONTACT");
refuse("adresse electronique inseree", ajout("Ecrivez a contact.fayna@example.sn"), "IA_LIEN_OU_CONTACT");
refuse("coordonnees bancaires inserees", ajout("Faites un virement sur mon IBAN."), "IA_LEXIQUE_INTERDIT");

/* --- A.6 detournement du canal de paiement --- */
refuse("canal remplace", BASE.split("Wave ou Orange Money").join("Western Union"), "IA_CANAL_ALTERE");
(function () {
  const c2 = Object.assign({}, CTX, { canalPaiement: "Wave" });
  const g2 = E.genererMessage(c2);
  const b2 = g2.fr + "\n\n" + g2.wo;
  const o2 = Object.assign({}, O, { canal: "Wave" });
  ok(E.verifierSortieIA(b2, b2, o2).ok === true, "canal a variante unique : reecriture identique acceptee");
  const r = E.verifierSortieIA(b2, b2.split("Wave").join("Orange Money"), o2);
  ok(r.ok === false, "canal a variante unique : substitution refusee");
})();

/* --- A.7 identite : nom du client, signature du creancier --- */
refuse("nom du client efface", BASE.split("Boutique Ndiaye").join("cher client"), "IA_NOM_ABSENT");
refuse("signature supprimee", BASE.split(SIG).join(""), "IA_SIGNATURE_ALTEREE");
refuse("signature remplacee", BASE.split(CTX.expediteur).join("Service recouvrement"), "IA_SIGNATURE_ALTEREE");

/* --- A.7 bis : champs attendus VIDES, le garde-fou ne se desarme pas (defauts reels c65) ---
   Un appelant direct du moteur (portage _core, integrateur) peut passer o incomplet. Sans repli,
   o.expediteur vide desactivait le controle de signature : le modele pouvait signer « Service
   Recouvrement SARL » a la place du creancier (usurpation). Desormais la verite de repli est la
   derniere ligne du message d'origine. */
(function () {
  const oSans = Object.assign({}, O, { expediteur: "" });
  ok(E.verifierSortieIA(BASE, BASE, oSans).ok === true,
     "o.expediteur vide : la reecriture identique reste acceptee (pas de faux positif)");
  const usurpe = BASE.split(CTX.expediteur).join("Service Recouvrement SARL");
  const r = E.verifierSortieIA(BASE, usurpe, oSans);
  ok(r.ok === false && r.violations.some((v) => v.code === "IA_SIGNATURE_ALTEREE"),
     "o.expediteur vide : la signature usurpee est QUAND MEME refusee (repli sur la base)");
  const sansSig = BASE.split(SIG).join("");
  ok(E.verifierSortieIA(BASE, sansSig, oSans).ok === false,
     "o.expediteur vide : la signature supprimee est quand meme refusee");
})();
refuse("canal detourne vers PayPal (lexique elargi c65)", ajout("Payez plutôt via PayPal."), "IA_LEXIQUE_INTERDIT");
refuse("canal detourne vers MoneyGram (lexique elargi c65)", ajout("Envoyez par MoneyGram."), "IA_LEXIQUE_INTERDIT");

/* --- A.8 langue et typographie (le produit se vend sur le FR + wolof accentues) --- */
refuse("accents et diacritiques supprimes", BASE.normalize("NFD").replace(/[̀-ͯ]/g, ""), "IA_ACCENTS_PERDUS");
refuse("partie wolof supprimee", G.fr, "IA_WOLOF_PERDU");
refuse("tiret cadratin introduit", ajout("Merci — vraiment."), "IA_TYPOGRAPHIE");
refuse("balise HTML introduite", ajout("<b>urgent</b>"), "IA_CARACTERE_INTERDIT");

/* --- A.9 degenerescences du modele --- */
refuse("reponse vide", "", "IA_VIDE");
refuse("reponse blanche", "   \n  ", "IA_VIDE");
refuse("reponse tronquee", BASE.slice(0, 40), "IA_LONGUEUR");
refuse("reponse delayee (x3)", BASE + "\n\n" + BASE + "\n\n" + BASE, "IA_LONGUEUR");
ok(E.verifierSortieIA(BASE, null, O).ok === false, "garde-fou REFUSE : reponse nulle");
ok(E.verifierSortieIA(BASE, undefined, O).ok === false, "garde-fou REFUSE : reponse indefinie");

/* --- A.10 le garde-fou verifie les 5 niveaux d'escalade, pas seulement le niveau 3 --- */
[["2026-07-08", 0], ["2026-07-01", 1], ["2026-06-15", 2], ["2026-05-22", 3], ["2026-03-01", 4]].forEach(function (cas) {
  const c = Object.assign({}, CTX, { echeance: cas[0] });
  const g = E.genererMessage(c);
  const b = g.fr + "\n\n" + g.wo;
  const o = { nom: c.nom, montant: c.montant, dateFr: g.dateFr, canal: c.canalPaiement, expediteur: c.expediteur };
  ok(g.niveau === cas[1], "niveau " + cas[1] + " : escalade attendue");
  ok(E.verifierSortieIA(b, b, o).ok === true, "niveau " + cas[1] + " : message du moteur accepte par son propre garde-fou");
  const i = b.indexOf("\n" + c.expediteur);
  const menace = b.slice(0, i) + " J'appelle la police. " + b.slice(i);
  ok(E.verifierSortieIA(b, menace, o).ok === false, "niveau " + cas[1] + " : menace ajoutee refusee");
});

/* --- A.11 le lexique ne penalise pas ce que le moteur ecrit legitimement --- */
// Faux positifs redoutes : « procédure » et « processus » contiennent la sous-chaine « proces ».
// Le lexique compare sur frontiere de mot, ces deux mots doivent donc passer.
ok(E.sansAccents("Procédure").indexOf("procedure") === 0, "repli des accents : « Procédure » devient « procedure »");
(function () {
  const lexique = (propose) => E.verifierSortieIA(BASE, propose, O).violations
    .filter((v) => v.code === "IA_LEXIQUE_INTERDIT").map((v) => v.detail);
  ok(lexique(ajout("Le processus suit son cours.")).length === 0, "« processus » n'est pas confondu avec « procès » (frontiere de mot)");
  ok(lexique(ajout("Une procédure amiable reste possible.")).length === 0, "« procédure » n'est pas confondu avec « procès »");
  ok(lexique(ajout("Je vous poursuis au tribunal.")).indexOf("proces") === -1 &&
     lexique(ajout("Je vous poursuis au tribunal.")).length > 0, "« procès » lui-meme reste detecte via « poursuit » et « tribunal »");
  accepte("phrase contenant « processus »", ajout("Le processus suit son cours."));
  accepte("phrase contenant « procédure »", ajout("Une procédure amiable reste possible."));
})();
(function () {
  // Le mot « recouvrement » est present dans la base au niveau 4 : il doit rester tolere.
  const c = Object.assign({}, CTX, { echeance: "2026-03-01" });
  const g = E.genererMessage(c);
  const b = g.fr + "\n\n" + g.wo;
  const o = { nom: c.nom, montant: c.montant, dateFr: g.dateFr, canal: c.canalPaiement, expediteur: c.expediteur };
  ok(b.indexOf("recouvrement") !== -1, "niveau 4 : le moteur ecrit bien « recouvrement »");
  ok(E.verifierSortieIA(b, b, o).ok === true, "un terme deja present dans la base n'est jamais compte comme ajoute");
})();

/* --- A.12 resume lisible des violations, sans doublon --- */
(function () {
  const r = E.verifierSortieIA(BASE, BASE.slice(0, 40), O);
  const resume = E.resumeViolations(r.violations);
  ok(typeof resume === "string" && resume.length > 0, "resumeViolations rend une phrase lisible");
  ok(resume.indexOf(";") !== -1, "resumeViolations separe les motifs");
  ok(resume.indexOf("IA_") === -1, "resumeViolations n'expose aucun code technique a l'utilisateur");
  const codes = r.violations.map((v) => v.code);
  const uniques = codes.filter((c, i) => codes.indexOf(c) === i);
  ok(E.resumeViolations(r.violations).split(" ; ").length === uniques.length, "resumeViolations dedoublonne les motifs");
})();

/* =========================================================================
   B. APPEL RESEAU ROBUSTE (fetch simule)
   ========================================================================= */

const pauseImmediate = () => Promise.resolve();
function reponse(status, corps) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status: status,
    json: () => Promise.resolve(corps)
  });
}
const CORPS_GROQ = { choices: [{ message: { content: "  Bonjour, voici la reecriture.  " } }] };
const CORPS_GEMINI = { candidates: [{ content: { parts: [{ text: "Reecriture Gemini." }] } }] };

function sonde() {
  const appels = [];
  const f = (url, options) => {
    appels.push({ url, options });
    return f._plan(appels.length - 1, url, options);
  };
  f.appels = appels;
  return f;
}

const essais = [];
function essai(nom, fn) { essais.push({ nom, fn }); }

/* --- B.1 succes nominal, extraction et rognage --- */
essai("succes Groq : texte extrait et rogne", () => {
  const f = sonde();
  f._plan = () => reponse(200, CORPS_GROQ);
  return E.appelerIA({ prov: "groq", cle: "k", prompt: "p", fetchImpl: f, pause: pauseImmediate }).then((t) => {
    ok(t === "Bonjour, voici la reecriture.", "Groq : contenu extrait et rogne");
    ok(f.appels.length === 1, "Groq : un seul appel reseau");
    ok(f.appels[0].url === "https://api.groq.com/openai/v1/chat/completions", "Groq : point d'entree attendu");
    ok(f.appels[0].options.headers.Authorization === "Bearer k", "Groq : cle en en-tete Authorization");
    ok(JSON.parse(f.appels[0].options.body).model === "openai/gpt-oss-20b", "Groq : modele aligne sur _core/llm");
  });
});

essai("succes Gemini : cle en en-tete, jamais dans l'URL", () => {
  const f = sonde();
  f._plan = () => reponse(200, CORPS_GEMINI);
  return E.appelerIA({ prov: "gemini", cle: "SECRET123", prompt: "p", fetchImpl: f, pause: pauseImmediate }).then((t) => {
    ok(t === "Reecriture Gemini.", "Gemini : contenu extrait");
    ok(f.appels[0].url.indexOf("SECRET123") === -1, "Gemini : la cle n'apparait PAS dans l'URL (pas de fuite en Referer ni en journal)");
    ok(f.appels[0].url.indexOf("?key=") === -1, "Gemini : aucun parametre de requete « key »");
    ok(f.appels[0].options.headers["x-goog-api-key"] === "SECRET123", "Gemini : cle transmise en en-tete x-goog-api-key");
  });
});

/* --- B.2 rejeu unique sur erreur transitoire --- */
essai("429 puis 200 : un rejeu, puis succes", () => {
  const f = sonde();
  f._plan = (i) => (i === 0 ? reponse(429, {}) : reponse(200, CORPS_GROQ));
  return E.appelerIA({ prov: "groq", cle: "k", prompt: "p", fetchImpl: f, pause: pauseImmediate }).then((t) => {
    ok(t.length > 0, "429 transitoire : la reponse finit par arriver");
    ok(f.appels.length === 2, "429 transitoire : exactement un rejeu");
  });
});

essai("503 persistant : echoue avec un message clair, sans boucle", () => {
  const f = sonde();
  f._plan = () => reponse(503, {});
  return E.appelerIA({ prov: "groq", cle: "k", prompt: "p", fetchImpl: f, pause: pauseImmediate }).then(
    () => ok(false, "503 persistant : aurait du echouer"),
    (e) => {
      ok(/indisponible/.test(e.message), "503 persistant : message « service indisponible » (obtenu : " + e.message + ")");
      // Borne generale, valable meme si la cascade s'allonge : chaque modele a droit a 1 essai + 1 rejeu.
      ok(f.appels.length === 2 * E.IA_MODELES.groq.length,
         "503 persistant : borne = 1 essai + 1 rejeu par modele, pas de boucle infinie (obtenu : " + f.appels.length + ")");
    }
  );
});

/* --- B.3 erreurs definitives : pas de rejeu inutile, message actionnable --- */
essai("401 : cle refusee, aucun rejeu", () => {
  const f = sonde();
  f._plan = () => reponse(401, {});
  return E.appelerIA({ prov: "groq", cle: "mauvaise", prompt: "p", fetchImpl: f, pause: pauseImmediate }).then(
    () => ok(false, "401 : aurait du echouer"),
    (e) => {
      ok(/cl[eé] refus[eé]e/.test(e.message), "401 : message « clé refusée » (obtenu : " + e.message + ")");
      ok(f.appels.length === 1, "401 : aucun rejeu (inutile de retenter avec une mauvaise cle)");
    }
  );
});

essai("429 persistant : quota, message actionnable", () => {
  const f = sonde();
  f._plan = () => reponse(429, {});
  return E.appelerIA({ prov: "groq", cle: "k", prompt: "p", fetchImpl: f, pause: pauseImmediate }).then(
    () => ok(false, "429 persistant : aurait du echouer"),
    (e) => ok(/quota/.test(e.message), "429 persistant : message « quota atteint » (obtenu : " + e.message + ")")
  );
});

/* --- B.4 repli de modele (un modele retire du catalogue ne casse pas le produit) --- */
essai("404 sur le 1er modele : repli sur le suivant", () => {
  const f = sonde();
  f._plan = (i) => (i === 0 ? reponse(404, {}) : reponse(200, CORPS_GROQ));
  return E.appelerIA({ prov: "groq", cle: "k", prompt: "p", fetchImpl: f, pause: pauseImmediate }).then((t) => {
    ok(t.length > 0, "404 modele : le repli aboutit");
    ok(f.appels.length === 2, "404 modele : exactement deux appels");
    ok(JSON.parse(f.appels[1].options.body).model === "llama-3.3-70b-versatile", "404 modele : bascule sur le modele de repli");
  });
});

essai("404 sur tous les modeles : echec propre", () => {
  const f = sonde();
  f._plan = () => reponse(404, {});
  return E.appelerIA({ prov: "groq", cle: "k", prompt: "p", fetchImpl: f, pause: pauseImmediate }).then(
    () => ok(false, "404 partout : aurait du echouer"),
    (e) => ok(e.message.length > 0, "404 partout : echec avec message (obtenu : " + e.message + ")")
  );
});

/* --- B.4 bis : erreur TRANSITOIRE persistante -> repli sur le modele suivant (defaut reel c65) ---
   Constat en production sur Gemini gratuit : 3 modeles renvoient 503 « high demand » pendant qu'un
   4e repond 200. L'ancien code rejouait le meme modele puis abandonnait : le produit tombait alors
   qu'un modele disponible attendait juste apres dans la cascade. */
essai("503 persistant sur le 1er modele : repli sur le suivant (defaut c65)", () => {
  const f = sonde();
  f._plan = (i) => (i < 2 ? reponse(503, {}) : reponse(200, CORPS_GROQ));
  return E.appelerIA({ prov: "groq", cle: "k", prompt: "p", fetchImpl: f, pause: pauseImmediate }).then((t) => {
    ok(t.length > 0, "503 persistant : la cascade aboutit sur le modele suivant");
    ok(f.appels.length === 3, "503 persistant : 1 essai + 1 rejeu sur le modele 1, puis le modele 2 (obtenu : " + f.appels.length + ")");
    ok(JSON.parse(f.appels[2].options.body).model === "llama-3.3-70b-versatile", "503 persistant : bascule bien sur le modele de repli");
  });
});

essai("429 persistant sur le 1er modele : repli sur le suivant (defaut c65)", () => {
  const f = sonde();
  f._plan = (i) => (i < 2 ? reponse(429, {}) : reponse(200, CORPS_GROQ));
  return E.appelerIA({ prov: "groq", cle: "k", prompt: "p", fetchImpl: f, pause: pauseImmediate })
    .then((t) => ok(t.length > 0, "429 persistant : le quota d'un modele ne condamne pas le fournisseur"));
});

essai("503 partout : la cascade est bornee, echec propre", () => {
  const f = sonde();
  f._plan = () => reponse(503, {});
  return E.appelerIA({ prov: "groq", cle: "k", prompt: "p", fetchImpl: f, pause: pauseImmediate }).then(
    () => ok(false, "503 partout : aurait du echouer"),
    (e) => {
      ok(/indisponible/.test(e.message), "503 partout : message « service indisponible » (obtenu : " + e.message + ")");
      ok(f.appels.length === 4, "503 partout : borne = 2 modeles x (1 essai + 1 rejeu), aucune boucle infinie (obtenu : " + f.appels.length + ")");
    }
  );
});

/* --- B.5 reponse malformee ou vide --- */
essai("corps sans contenu : refuse au lieu d'afficher du vide", () => {
  const f = sonde();
  f._plan = () => reponse(200, { choices: [] });
  return E.appelerIA({ prov: "groq", cle: "k", prompt: "p", fetchImpl: f, pause: pauseImmediate }).then(
    () => ok(false, "corps vide : aurait du echouer"),
    (e) => {
      ok(/vide/.test(e.message), "corps vide : message « réponse vide » (obtenu : " + e.message + ")");
      ok(f.appels.length === 1, "corps vide : pas de rejeu (le fournisseur a repondu 200)");
    }
  );
});

/* --- B.6 delai maximal et abandon --- */
essai("delai depasse : la requete est abandonnee", () => {
  const f = sonde();
  f._plan = (i, url, options) => new Promise((resolve, reject) => {
    // ne repond jamais : seul l'abandon (AbortController) peut denouer
    options.signal.addEventListener("abort", () => {
      const e = new Error("aborted");
      e.name = "AbortError";
      reject(e);
    });
  });
  return E.appelerIA({ prov: "groq", cle: "k", prompt: "p", fetchImpl: f, pause: pauseImmediate, timeoutMs: 30 }).then(
    () => ok(false, "delai : aurait du echouer"),
    (e) => {
      ok(/d[eé]lai d[eé]pass[eé]/.test(e.message), "delai : message « délai dépassé » (obtenu : " + e.message + ")");
      ok(f.appels[0].options.signal !== undefined, "delai : un signal d'abandon est bien transmis a fetch");
    }
  );
});

essai("sans AbortController : la promesse se regle quand meme (defaut reel c65)", () => {
  // Environnement minimal sans AbortController : la requete ne peut pas etre annulee, mais la
  // promesse DOIT se regler par une course contre le minuteur, sinon le bouton IA fige a jamais.
  const AC = globalThis.AbortController;
  delete globalThis.AbortController;
  const f = sonde();
  f._plan = () => new Promise(() => {});   // requete qui pend pour toujours
  return E.appelerIA({ prov: "groq", cle: "k", prompt: "p", fetchImpl: f, pause: pauseImmediate, timeoutMs: 30 }).then(
    () => { globalThis.AbortController = AC; ok(false, "sans AbortController : aurait du echouer par delai"); },
    (e) => {
      globalThis.AbortController = AC;
      ok(/d[eé]lai d[eé]pass[eé]/.test(e.message), "sans AbortController : delai depasse signale (obtenu : " + e.message + ")");
      ok(f.appels[0].options.signal === undefined, "sans AbortController : aucun signal fantome transmis");
    }
  );
});

essai("panne reseau : un rejeu puis message clair", () => {
  const f = sonde();
  f._plan = () => Promise.reject(new TypeError("Failed to fetch"));
  return E.appelerIA({ prov: "groq", cle: "k", prompt: "p", fetchImpl: f, pause: pauseImmediate }).then(
    () => ok(false, "panne reseau : aurait du echouer"),
    (e) => {
      ok(/r[eé]seau indisponible/.test(e.message), "panne reseau : message « réseau indisponible » (obtenu : " + e.message + ")");
      ok(f.appels.length === 2, "panne reseau : exactement un rejeu");
    }
  );
});

/* --- B.7 garde d'entree : aucun appel reseau parti pour rien --- */
essai("aucune cle : rejet immediat, zero appel reseau", () => {
  const f = sonde();
  f._plan = () => reponse(200, CORPS_GROQ);
  return E.appelerIA({ prov: "groq", cle: "  ", prompt: "p", fetchImpl: f, pause: pauseImmediate }).then(
    () => ok(false, "aucune cle : aurait du echouer"),
    (e) => {
      ok(/aucune cl[eé]/.test(e.message), "aucune cle : message explicite");
      ok(f.appels.length === 0, "aucune cle : aucun appel reseau emis");
    }
  );
});

essai("prompt vide : rejet immediat, zero appel reseau", () => {
  const f = sonde();
  f._plan = () => reponse(200, CORPS_GROQ);
  return E.appelerIA({ prov: "groq", cle: "k", prompt: "   ", fetchImpl: f, pause: pauseImmediate }).then(
    () => ok(false, "prompt vide : aurait du echouer"),
    (e) => {
      ok(/message vide/.test(e.message), "prompt vide : message explicite");
      ok(f.appels.length === 0, "prompt vide : aucun appel reseau emis");
    }
  );
});

/* --- B.8 chaine complete : appel + garde-fou --- */
essai("chaine complete : une reecriture honnete est acceptee", () => {
  const f = sonde();
  f._plan = () => reponse(200, { choices: [{ message: { content: BASE } }] });
  return E.appelerIA({ prov: "groq", cle: "k", prompt: E.construirePromptIA(BASE, O), fetchImpl: f, pause: pauseImmediate })
    .then((t) => ok(E.verifierSortieIA(BASE, t, O).ok === true, "chaine complete : reecriture honnete acceptee"));
});

essai("chaine complete : une reecriture menacante est bloquee AVANT affichage", () => {
  const f = sonde();
  const i = BASE.indexOf(SIG);
  const menacant = BASE.slice(0, i) + " Payez 200 000 FCFA ou j'appelle la police." + BASE.slice(i);
  f._plan = () => reponse(200, { choices: [{ message: { content: menacant } }] });
  return E.appelerIA({ prov: "groq", cle: "k", prompt: E.construirePromptIA(BASE, O), fetchImpl: f, pause: pauseImmediate })
    .then((t) => {
      const v = E.verifierSortieIA(BASE, t, O);
      ok(v.ok === false, "chaine complete : reecriture menacante refusee");
      const codes = v.violations.map((x) => x.code);
      ok(codes.indexOf("IA_NOMBRE_INVENTE") !== -1, "chaine complete : le montant gonfle est detecte");
      ok(codes.indexOf("IA_LEXIQUE_INTERDIT") !== -1, "chaine complete : la menace est detectee");
    });
});

/* --- B.9 le prompt enonce les contraintes verifiees --- */
(function () {
  const p = E.construirePromptIA(BASE, O);
  ok(p.indexOf(BASE) !== -1, "prompt : contient le message a reecrire");
  ok(p.indexOf(O.expediteur) !== -1, "prompt : rappelle la signature attendue");
  ok(p.indexOf(O.dateFr) !== -1, "prompt : rappelle la date d'echeance");
  ok(/aucun nombre/i.test(p), "prompt : interdit d'introduire un nombre");
  ok(/tiret cadratin/i.test(p), "prompt : interdit le tiret cadratin");
  ok(!/[—–]/.test(p), "prompt : ne contient lui-meme aucun tiret cadratin");
})();

/* --- B.10 repli deterministe : le produit marche sans aucune cle (ARCHITECTURE.md s4) --- */
ok(BASE.length > 100 && BASE.indexOf(MONTANT) !== -1,
   "repli deterministe : sans cle, le moteur produit deja un message complet et exact");
ok(/if \(ai\.key\)/.test(html), "l'IA est strictement optionnelle : le bouton n'existe que si une cle est saisie");

/* =========================================================================
   Execution des essais asynchrones, puis rapport
   ========================================================================= */
(async function () {
  for (const e of essais) {
    try { await e.fn(); }
    catch (err) { ok(false, "essai « " + e.nom + " » : exception inattendue (" + err.message + ")"); }
  }

  console.log("");
  console.log("Sonde IA FAYNA (c65) : " + pass + " verts, " + fail + " rouges.");
  if (fail) {
    console.log("\nECHECS :");
    fails.forEach((f) => console.log("  x " + f));
    process.exit(1);
  }
  console.log("Garde-fou de sortie et appel robuste : tout est vert. Exit 0.");
  process.exit(0);
})();
