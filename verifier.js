#!/usr/bin/env node
/**
 * Harnais de preuve FAYNA — remplace docs/verifier-fayna.js (mort depuis le 2026-08-14,
 * il evaluait un bloc /*ENGINE_START* / d'un index.html qui n'existe plus).
 *
 *   node verifier.js            controles hors ligne
 *   node verifier.js --live     + verification de l'URL publique reelle
 *   node verifier.js --rouge    auto-test : prouve que le harnais SAIT virer au rouge
 *
 * Regles appliquees (LECONS du cerveau) :
 *  - n8 : un verificateur qui echoue en silence ment -> sortie 1 ferme, aucun controle conditionnel.
 *  - n15 : on matche le RADICAL sans accent ni \b, jamais des formes flechies.
 *  - n17 : un champ absent ne doit jamais passer mieux qu'un champ faux.
 *  - n18 : le harnais doit etre prouve capable de virer au rouge.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = __dirname;
const URL_PUBLIQUE = "https://thibaudlepan77-svg.github.io/fayna-relance-ia/";

// Faits canoniques, source : cerveau\projets\chiffrage-bareme-modules.md (contact canonique)
const TEL_CANONIQUE = "221784266546";
const MAIL_CANONIQUE = "contact@jaayleer.com";

let pass = 0;
const echecs = [];
function ok(cond, label) {
  if (cond) pass++;
  else echecs.push(label);
}

/** Normalise pour un matching par radical : minuscules, sans accent. (LECON 15) */
function sansAccent(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Lit un fichier obligatoire. Un fichier absent est un ECHEC, jamais un controle saute. (LECON 17) */
function lire(nom) {
  const p = path.join(ROOT, nom);
  if (!fs.existsSync(p)) {
    echecs.push(`fichier obligatoire absent : ${nom}`);
    return null;
  }
  return fs.readFileSync(p, "utf8");
}

/** Extrait la section objections de la page de vente. */
function sectionObjections(html) {
  const i = html.indexOf('id="objections"');
  if (i === -1) return null;
  const j = html.indexOf("<section", i);
  return html.slice(i, j === -1 ? html.length : j);
}

function controler(vente, demo, objections, parcours) {
  /* ---------- 1. Contacts : aucun placeholder ne doit atteindre le public ---------- */
  if (vente !== null) {
    ok(vente.includes(TEL_CANONIQUE), "page de vente porte le numero canonique " + TEL_CANONIQUE);
    ok(vente.includes(MAIL_CANONIQUE), "page de vente porte l'email canonique " + MAIL_CANONIQUE);

    // Tout numero senegalais present doit etre le canonique. Attrape 770000000, 771234567, etc.
    const numeros = [...vente.matchAll(/221\d{9}/g)].map((m) => m[0]);
    const intrus = [...new Set(numeros.filter((n) => n !== TEL_CANONIQUE))];
    ok(intrus.length === 0, "aucun numero non canonique sur la page de vente (trouves : " + intrus.join(", ") + ")");

    // Numeros ecrits en clair et manifestement fictifs.
    const compacte = vente.replace(/[\s  .-]/g, "");
    ok(!compacte.includes("221770000000"), "pas de numero fictif 77 000 00 00 en clair");

    const mails = [...new Set([...vente.matchAll(/[a-zA-Z0-9._-]+@jaayleer\.com/g)].map((m) => m[0]))];
    const mailsIntrus = mails.filter((m) => m !== MAIL_CANONIQUE);
    ok(mailsIntrus.length === 0, "aucun email non canonique (trouves : " + mailsIntrus.join(", ") + ")");
  }

  /* ---------- 2. Prix : present, et COHERENT entre la page et le parcours ---------- */
  if (vente !== null && parcours !== null) {
    //   insecable et   fine : le prix s'ecrit "5 000" avec une espace non ASCII.
    const prixPage = [...vente.matchAll(/class="price">\s*([\d   ]+)/g)]
      .map((m) => m[1].replace(/[^\d]/g, ""));
    ok(prixPage.length === 2, "la page affiche exactement 2 prix (trouve " + prixPage.length + ")");
    ok(prixPage.includes("5000") && prixPage.includes("15000"),
      "prix publics affiches = 5000 et 15000 FCFA (trouves : " + prixPage.join(", ") + ")");

    // Le meme couple de prix doit figurer dans le parcours d'entree, sinon les documents divergent.
    const parcoursCompacte = parcours.replace(/[\s  ]/g, "");
    for (const p of ["5000FCFA", "15000FCFA"]) {
      ok(parcoursCompacte.includes(p), "PARCOURS-ENTREE.md porte le meme prix " + p);
    }
  }

  /* ---------- 3. Objections : la page en promet 5, elle doit en afficher 5 ---------- */
  if (vente !== null && objections !== null) {
    const sec = sectionObjections(vente);
    ok(sec !== null, "section #objections presente sur la page de vente");
    if (sec) {
      const surLaPage = (sec.match(/<h3>«/g) || []).length;
      ok(surLaPage === 5, "5 objections affichees sur la page (trouve " + surLaPage + ")");
    }
    const dansLeDoc = (objections.match(/^## \d+\. «/gm) || []).length;
    ok(dansLeDoc === 5, "OBJECTIONS.md contient 5 objections (trouve " + dansLeDoc + ")");
  }

  /* ---------- 4. Aucune allegation juridique invérifiable sur un support public ---------- */
  // Le cerveau a deja paye cette erreur (facture « conforme au CGI » sans NINEA ni RCCM).
  if (vente !== null) {
    const n = sansAccent(vente);
    ok(!n.includes("aucun risque juridique"), "pas d'allegation « aucun risque juridique »");
    ok(!/article\s+\d+\s+de\s+l'?acte\s+uniforme/.test(n), "pas de citation d'article OHADA non verifiee");
    // Radical « conform » : attrape conforme, conformement, conformite. (LECON 15)
    ok(!n.includes("conform"), "pas d'allegation de conformite (radical « conform »)");
    ok(!n.includes("mise en demeure ohada"), "pas de mise en demeure presentee comme certifiee OHADA");
  }

  /* ---------- 5. La demo doit s'ouvrir SANS COMPTE (exigence du rang 1) ---------- */
  if (demo !== null) {
    const n = sansAccent(demo);
    ok(!/type=["']password["']/.test(n), "la demo ne contient aucun champ mot de passe");
    for (const mot of ["se connecter", "inscription", "creer un compte", "connexion requise"]) {
      ok(!n.includes(mot), "la demo n'exige pas de compte (absence de « " + mot + " »)");
    }
    ok(n.includes("localstorage"), "la demo persiste en local (localStorage), aucun serveur");
    // Le lien WhatsApp de la demo est construit depuis la fiche du debiteur fictif, pas code en dur.
    ok(/wa\.me\/\$\{/.test(demo), "la demo construit wa.me depuis la donnee, pas un numero en dur");
  }

  /* ---------- 6. Aucune fonction promise a la demo qu'elle n'a pas ---------- */
  // c74 : « 20/22 fausses promesses passaient invisibles ». Les documents de vente ont
  // continue a promettre echeancier / export CSV / mise en demeure APRES que la
  // reimplementation de demo.html les a perdus. Ce controle rend la divergence
  // impossible a reintroduire en silence.
  if (demo !== null && parcours !== null) {
    const nDemo = sansAccent(demo);
    // Zone = uniquement ce que l'etape 2 affirme de LA DEMO, borne a l'encadre d'ecart.
    // Hors de cette zone, parler d'export CSV decrit le PRODUIT complet, ce qui est licite.
    const nPar = sansAccent(parcours);
    const debut = nPar.indexOf("etape 2");
    const fin = nPar.indexOf("ecart connu");
    ok(debut !== -1 && fin !== -1 && fin > debut,
      "PARCOURS-ENTREE.md borne sa section demo (etape 2 ... ecart connu)");
    const zone = debut !== -1 && fin > debut ? nPar.slice(debut, fin) : nPar;
    for (const fonction of ["echeancier", "csv", "mise en demeure"]) {
      const dansLaDemo = nDemo.includes(fonction);
      const promiseAuParcours = zone.includes(fonction);
      ok(!(promiseAuParcours && !dansLaDemo),
        "le parcours ne promet pas « " + fonction + " » a une demo qui ne l'a pas");
    }
  }
}

/* ---------- 7. Verification en ligne (--live) ---------- */
function verifierEnLigne() {
  return new Promise((resolve) => {
    https.get(URL_PUBLIQUE, (res) => {
      let corps = "";
      res.on("data", (c) => (corps += c));
      res.on("end", () => {
        ok(res.statusCode === 200, "URL publique repond 200 (recu " + res.statusCode + ")");
        ok(corps.length > 10000, "la page publique n'est pas vide (" + corps.length + " octets)");
        ok(corps.includes("FAYNA"), "la page publique porte la marque FAYNA");
        ok(corps.includes("localStorage"), "la demo publique embarque son moteur local");
        // Rien de commercial ne doit etre publie sur GitHub Pages (ToS : pas de site
        // « primarily directed at facilitating commercial transactions »).
        ok(!corps.includes("FCFA/mois"), "aucun tarif publie sur GitHub Pages (respect des ToS)");
        ok(!corps.includes("221770000000"), "aucun numero fictif en ligne");
        resolve();
      });
    }).on("error", (e) => {
      ok(false, "URL publique injoignable : " + e.message);
      resolve();
    });
  });
}

/* ---------- Auto-test : prouver que le harnais PEUT virer au rouge (LECON 18) ---------- */
function autoTestRouge() {
  const mutations = [
    ["numero fictif reintroduit", (v) => v.replace(TEL_CANONIQUE, "221770000000")],
    ["email invente reintroduit", (v) => v.replace(MAIL_CANONIQUE, "fayna@jaayleer.com")],
    ["allegation de conformite reintroduite", (v) => v.replace("</body>", "<p>Facture conforme au droit OHADA.</p></body>")],
    ["une objection supprimee", (v) => v.replace("<h3>« C'est trop cher. »</h3>", "<h3>supprimee</h3>")],
    ["prix desaccorde entre page et parcours", (v) => v.replace(/class="price">5[   ]000/, 'class="price">9 000')],
  ];
  // Mutations portant sur PARCOURS-ENTREE.md : elles reintroduisent la fausse promesse
  // reellement constatee le 2026-08-15 (echeancier / CSV promis a une demo qui ne les a pas).
  const mutationsParcours = [
    ["echeancier re-promis a la demo", (p) => p.replace("4. **Copier le message**", "4. **Proposer un échéancier**")],
    ["bornes de la section demo effacees", (p) => p.replace(/Écart connu/g, "Remarque")],
  ];

  const vente0 = lire("index.html");
  const demo0 = lire("demo.html");
  const obj0 = lire("OBJECTIONS.md");
  const par0 = lire("PARCOURS-ENTREE.md");
  let attrapees = 0;
  const total = mutations.length + mutationsParcours.length;

  function essayer(nom, v, d, o, p) {
    pass = 0; echecs.length = 0;
    controler(v, d, o, p);
    if (echecs.length > 0) { attrapees++; console.log("  [rouge OK] " + nom + " -> " + echecs.length + " echec(s)"); }
    else console.log("  [TROU] " + nom + " NON DETECTEE");
  }

  for (const [nom, muter] of mutations) essayer(nom, muter(vente0), demo0, obj0, par0);
  for (const [nom, muter] of mutationsParcours) essayer(nom, vente0, demo0, obj0, muter(par0));

  console.log("\nMutations attrapees : " + attrapees + "/" + total);
  process.exit(attrapees === total ? 0 : 1);
}

/* ---------- Execution ---------- */
(async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--rouge")) return autoTestRouge();

  controler(lire("index.html"), lire("demo.html"), lire("OBJECTIONS.md"), lire("PARCOURS-ENTREE.md"));
  if (args.includes("--live")) await verifierEnLigne();

  console.log("FAYNA — harnais de preuve");
  console.log("  verts  : " + pass);
  console.log("  echecs : " + echecs.length);
  for (const e of echecs) console.log("    - " + e);
  process.exit(echecs.length === 0 ? 0 : 1);
})();
