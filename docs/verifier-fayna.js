#!/usr/bin/env node
/**
 * Oracle zero-dependance de FAYNA (assistant de relance des impayes). 217 controles au c60,
 * enrichi au c61 (echeancier de paiement negocie + cadence de relance conseillee).
 * Verifie : structure/SEO/a11y du HTML, honnetete verrouillee, hors-ligne (aucune
 * ressource externe chargee), et la LOGIQUE REELLE du moteur (extrait du HTML et
 * evalue en Node pur) : formats FCFA/date, seuils d'escalade, telephone, lien
 * WhatsApp, generation bilingue deterministe. Exit 0 si tout est vert.
 *
 * Usage : node docs/verifier-fayna.js
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
// 2026-08-15 : la cible n'est plus index.html (devenu la PAGE DE VENTE le 2026-08-14, ce qui
// faisait planter cet oracle sur un bloc ENGINE_START absent). Le moteur vit dans demo.html,
// l'artefact reellement publie. Surchargeable : node docs/verifier-fayna.js <fichier>.
const CIBLE = process.argv[2] || "demo.html";
const html = fs.readFileSync(path.join(ROOT, CIBLE), "utf8");

const NBSP = " ";
const FINE = " ";

let pass = 0, fail = 0, warn = 0;
const fails = [];
function ok(cond, label) {
  if (cond) { pass++; }
  else { fail++; fails.push(label); }
}
function warnIf(cond, label) { if (cond) { warn++; console.log("  [avert] " + label); } }

/* ---------- 1. Extraction + eval du moteur ---------- */
const mStart = html.indexOf("/*ENGINE_START*/");
const mEnd = html.indexOf("/*ENGINE_END*/");
ok(mStart !== -1 && mEnd !== -1 && mEnd > mStart, "bornes /*ENGINE_START*/ et /*ENGINE_END*/ presentes");
const block = html.slice(mStart, mEnd);
let E = null;
try {
  E = (0, eval)(block + "\n;FAYNA_ENGINE");
} catch (e) {
  ok(false, "eval du moteur sans erreur (" + e.message + ")");
}
ok(E && typeof E.genererMessage === "function", "moteur exporte genererMessage");
ok(E && typeof E.fmtMontant === "function", "moteur exporte fmtMontant");

if (E) {
  /* ---------- 2. Format des montants (fines FR) ---------- */
  ok(E.fmtMontant(150000) === "150" + FINE + "000" + NBSP + "FCFA", "fmtMontant(150000) fine milliers + insecable FCFA");
  ok(E.fmtMontant(5000) === "5" + FINE + "000" + NBSP + "FCFA", "fmtMontant(5000)");
  ok(E.fmtMontant(0) === "0" + NBSP + "FCFA", "fmtMontant(0)");
  ok(E.fmtMontant(1234567) === "1" + FINE + "234" + FINE + "567" + NBSP + "FCFA", "fmtMontant(1234567) deux fines");
  ok(E.fmtMontant(640000) === "640" + FINE + "000" + NBSP + "FCFA", "fmtMontant(640000)");
  ok(!/ FCFA\b/.test("x") || E.fmtMontant(100).indexOf(NBSP + "FCFA") !== -1, "FCFA precede d'une insecable");

  /* ---------- 3. Date FR ---------- */
  ok(E.fmtDateFr("2026-07-08") === "8" + NBSP + "juillet" + NBSP + "2026", "fmtDateFr(2026-07-08) = 8 juillet 2026");
  ok(E.fmtDateFr("2026-01-01") === "1" + NBSP + "janvier" + NBSP + "2026", "fmtDateFr(2026-01-01)");
  ok(E.fmtDateFr("2026-12-31") === "31" + NBSP + "décembre" + NBSP + "2026", "fmtDateFr(2026-12-31) accentue");
  ok(E.fmtDateFr("2026-02-15") === "15" + NBSP + "février" + NBSP + "2026", "fmtDateFr(fevrier) accentue");
  ok(E.fmtDateFr("bad") === "", "fmtDateFr(entree invalide) = chaine vide");

  /* ---------- 4. Jours de retard ---------- */
  ok(E.joursRetard("2026-07-01", "2026-07-08") === 7, "joursRetard 7 jours");
  ok(E.joursRetard("2026-07-08", "2026-07-08") === 0, "joursRetard 0 le jour meme");
  ok(E.joursRetard("2026-07-10", "2026-07-08") === -2, "joursRetard negatif avant echeance");
  ok(E.joursRetard("2026-06-08", "2026-07-08") === 30, "joursRetard 30 jours a cheval sur un mois");

  /* ---------- 5. Seuils d'escalade ---------- */
  ok(E.niveau(-5) === 0 && E.niveau(2) === 0, "niveau 0 jusqu'a J+2");
  ok(E.niveau(3) === 1 && E.niveau(14) === 1, "niveau 1 de J+3 a J+14");
  ok(E.niveau(15) === 2 && E.niveau(30) === 2, "niveau 2 de J+15 a J+30");
  ok(E.niveau(31) === 3 && E.niveau(60) === 3, "niveau 3 de J+31 a J+60");
  ok(E.niveau(61) === 4 && E.niveau(400) === 4, "niveau 4 au-dela de J+60");
  ok(Array.isArray(E.NIVEAUX) && E.NIVEAUX.length === 5, "5 niveaux definis");

  /* ---------- 6. Priorite (cout d'ignorance) ---------- */
  ok(E.prioriteScore(100000, 0) === 100000, "prioriteScore sans retard = montant");
  ok(E.prioriteScore(100000, 120) === 300000, "prioriteScore plafond x3 a 120 jours");
  ok(E.prioriteScore(100000, 60) > E.prioriteScore(100000, 10), "priorite croit avec l'anciennete");
  ok(E.prioriteScore(500000, 5) > E.prioriteScore(50000, 100), "un gros montant recent passe devant un petit tres ancien");

  /* ---------- 7. Telephone + WhatsApp ---------- */
  ok(E.normTel("77 123 45 67") === "221771234567", "normTel ajoute l'indicatif 221");
  ok(E.normTel("+221 77 123 45 67") === "221771234567", "normTel garde 221 existant");
  ok(E.normTel("00221771234567") === "221771234567", "normTel gere 00221");
  ok(E.normTel("") === "", "normTel vide reste vide");
  const lien = E.lienWhatsapp("771234567", "Bonjour");
  ok(/^https:\/\/wa\.me\/221771234567\?text=/.test(lien), "lienWhatsapp forme correcte");
  ok(decodeURIComponent(lien.split("text=")[1]) === "Bonjour", "texte WhatsApp encode/decodable");

  /* ---------- 8. Generation des messages ---------- */
  const base = {
    nom: "Boutique Ndiaye", montant: 150000, echeance: "2026-06-16",
    relation: "habituel", expediteur: "Ets Diallo", canalPaiement: "Wave ou Orange Money",
    aujourdhui: "2026-07-08"
  };
  const g = E.genererMessage(base);
  ok(g && g.fr && g.wo, "message a une version FR et une version wolof");
  ok(g.niveau === 2, "niveau calcule = 2 pour 22 jours de retard");
  ok(g.fr.indexOf("150" + FINE + "000" + NBSP + "FCFA") !== -1, "le montant formate figure dans le message FR");
  ok(g.fr.indexOf("16" + NBSP + "juin" + NBSP + "2026") !== -1, "la date FR figure dans le message");
  ok(g.fr.indexOf("Ets Diallo") !== -1, "la signature figure dans le message");
  ok(g.fr.indexOf("Wave ou Orange Money") !== -1, "le moyen de paiement figure dans le message");
  ok(g.wo.indexOf("150" + FINE + "000" + NBSP + "FCFA") !== -1, "le montant figure aussi dans le wolof");
  ok(/[éèàâêîôûùçÉÈÀ]/.test(g.fr), "message FR accentue (typographie francaise correcte)");
  ok(/[ëóñ]/.test(g.wo), "message wolof avec diacritiques (ë, ó, ñ)");

  // les 5 niveaux produisent chacun un texte distinct, non vide, sans tiret cadratin
  const dates = { 0: "2026-07-08", 1: "2026-07-01", 2: "2026-06-20", 3: "2026-06-01", 4: "2026-04-01" };
  const textes = {};
  let tousDistincts = true, tousNonVides = true, aucunEmDash = true;
  Object.keys(dates).forEach(function (niv) {
    const gg = E.genererMessage(Object.assign({}, base, { echeance: dates[niv] }));
    ok(gg.niveau === Number(niv), "niveau attendu " + niv + " pour echeance " + dates[niv]);
    const t = gg.fr + "\n" + gg.wo;
    if (!gg.fr.trim() || !gg.wo.trim()) tousNonVides = false;
    if (/[—–]/.test(t)) aucunEmDash = false;
    textes[niv] = gg.fr;
  });
  const vals = Object.keys(textes).map(function (k) { return textes[k]; });
  tousDistincts = new Set(vals).size === vals.length;
  ok(tousDistincts, "les 5 niveaux produisent des messages FR distincts");
  ok(tousNonVides, "aucun message vide sur les 5 niveaux");
  ok(aucunEmDash, "aucun tiret cadratin/demi-cadratin dans les messages generes");

  // escalade honnete : la mise en demeure (niv 3) doit mentionner un delai et rester amiable
  const m3 = E.genererMessage(Object.assign({}, base, { echeance: "2026-06-01" }));
  ok(/en demeure/i.test(m3.fr) && /amiable/i.test(m3.fr), "niveau 3 = mise en demeure + ouverture amiable");
  ok(/8 jours/.test(m3.fr), "niveau 3 fixe un delai de 8 jours");
  const m4 = E.genererMessage(Object.assign({}, base, { echeance: "2026-04-01" }));
  ok(/recouvrement/i.test(m4.fr) && /amiable|contactez/i.test(m4.fr), "niveau 4 = avertissement mais porte de sortie amiable");

  // aucun message ne promet un resultat ni ne menace de facon illicite
  vals.forEach(function (t, i) {
    ok(!/garanti/i.test(t), "message niveau " + i + " ne promet rien de garanti");
    ok(!/prison|police|arreter/i.test(t), "message niveau " + i + " sans menace illicite");
  });

  // determinisme : deux appels identiques => resultat identique
  const a1 = E.genererMessage(base), a2 = E.genererMessage(base);
  ok(a1.fr === a2.fr && a1.wo === a2.wo, "generation deterministe (memes entrees => meme sortie)");

  // ton adaptatif selon la relation
  const gh = E.genererMessage(Object.assign({}, base, { relation: "habituel", echeance: "2026-07-08" }));
  const gs = E.genererMessage(Object.assign({}, base, { relation: "sensible", echeance: "2026-07-08" }));
  const gn = E.genererMessage(Object.assign({}, base, { relation: "nouveau", echeance: "2026-07-08" }));
  ok(gh.fr !== gn.fr && gs.fr !== gn.fr, "le ton varie selon la relation (habituel/sensible/nouveau)");

  /* ---------- 8b. Nombre en toutes lettres (mise en demeure) ---------- */
  ok(typeof E.nombreEnLettres === "function", "moteur exporte nombreEnLettres");
  ok(typeof E.genererMiseEnDemeure === "function", "moteur exporte genererMiseEnDemeure");
  var casEnLettres = [
    [0, "zéro"], [1, "un"], [16, "seize"], [17, "dix-sept"], [21, "vingt et un"],
    [71, "soixante et onze"], [80, "quatre-vingts"], [81, "quatre-vingt-un"], [91, "quatre-vingt-onze"],
    [100, "cent"], [200, "deux cents"], [201, "deux cent un"], [180, "cent quatre-vingts"],
    [1000, "mille"], [1200, "mille deux cents"], [2000, "deux mille"],
    [5000, "cinq mille"], [15000, "quinze mille"], [21000, "vingt et un mille"],
    [80000, "quatre-vingt mille"], [90000, "quatre-vingt-dix mille"],
    [150000, "cent cinquante mille"], [200000, "deux cent mille"], [300000, "trois cent mille"],
    [640000, "six cent quarante mille"], [999999, "neuf cent quatre-vingt-dix-neuf mille neuf cent quatre-vingt-dix-neuf"],
    [1000000, "un million"], [2000000, "deux millions"], [1234567, "un million deux cent trente-quatre mille cinq cent soixante-sept"]
  ];
  casEnLettres.forEach(function (c) {
    ok(E.nombreEnLettres(c[0]) === c[1], "nombreEnLettres(" + c[0] + ") = « " + c[1] + " » (obtenu « " + E.nombreEnLettres(c[0]) + " »)");
  });
  ok(E.montantEnLettresFCFA(150000) === "cent cinquante mille francs CFA", "montantEnLettresFCFA(150000) pluriel francs");
  ok(E.montantEnLettresFCFA(1) === "un franc CFA", "montantEnLettresFCFA(1) singulier franc");

  /* ---------- 8c. Mise en demeure formelle (structure + honnetete + OHADA) ---------- */
  var mep = E.genererMiseEnDemeure({
    nom: "Ets Fall & Frères", montant: 640000, echeance: "2026-05-22",
    expediteur: "Ets Diallo", canalPaiement: "Wave", lieu: "Dakar", aujourdhui: "2026-07-08"
  });
  ok(mep && Array.isArray(mep.paragraphes) && mep.paragraphes.length >= 4, "mise en demeure : corps structure en paragraphes");
  var mepTxt = mep.paragraphes.join("\n") + "\n" + mep.note + "\n" + mep.objet;
  ok(mepTxt.indexOf("640" + FINE + "000" + NBSP + "FCFA") !== -1, "mise en demeure : montant en chiffres (FCFA fine)");
  ok(mepTxt.indexOf("six cent quarante mille francs CFA") !== -1, "mise en demeure : montant en toutes lettres present");
  ok(mepTxt.indexOf("22" + NBSP + "mai" + NBSP + "2026") !== -1, "mise en demeure : date d'echeance FR");
  ok(mep.delai === 8 && /d[eé]lai de 8 jours/.test(mepTxt), "mise en demeure : delai formel de 8 jours");
  // 2026-08-15 : l'assertion « le courrier cite le cadre OHADA » est REMPLACEE, pas relachee.
  // Elle exigeait exactement ce que la doctrine interdit desormais : un modele de lettre qui
  // s'auto-certifie conforme a un texte de loi. Ce qui la remplace est PLUS contraignant
  // (1 controle -> 3), et porte sur l'invariant qui compte : la lettre dit ce qui peut suivre,
  // sans pretendre au visa d'un texte que personne n'a verifie.
  ok(/injonction de payer/i.test(mepTxt), "mise en demeure : nomme la suite possible (injonction de payer)");
  ok(!/acte uniforme/i.test(mepTxt) && !/conform/i.test(mepTxt),
    "mise en demeure : AUCUNE auto-certification legale dans le courrier (radical « conform », « acte uniforme »)");
  ok(/recommand[eé]e? avec accus[eé] de r[eé]ception/i.test(mepTxt) && /huissier/i.test(mepTxt),
    "mise en demeure : la note renvoie au recommande AR et a l'huissier pour la valeur probante");
  ok(/amiable/i.test(mepTxt), "mise en demeure : ouverture a une issue amiable");
  ok(/ne garantit aucun r[eé]sultat/i.test(mep.note), "mise en demeure : note honnete (aucun resultat garanti)");
  ok(/huissier/i.test(mep.note) && /recommand[eé]e/i.test(mep.note), "mise en demeure : recommande RAR/huissier pour la valeur probante");
  ok(!/garanti(?!t aucun)/i.test(mepTxt) && !/prison|police/i.test(mepTxt), "mise en demeure : aucune promesse ni menace illicite");
  ok(!/[—–]/.test(mepTxt), "mise en demeure : aucun tiret cadratin/demi-cadratin");
  var mep2 = E.genererMiseEnDemeure({
    nom: "Ets Fall & Frères", montant: 640000, echeance: "2026-05-22",
    expediteur: "Ets Diallo", canalPaiement: "Wave", lieu: "Dakar", aujourdhui: "2026-07-08"
  });
  ok(JSON.stringify(mep) === JSON.stringify(mep2), "mise en demeure : generation deterministe");
  ok(mep.jours === E.joursRetard("2026-05-22", "2026-07-08"), "mise en demeure : jours de retard coherents");

  /* ---------- 8d. Historique des relances envoyees (suivi par client, F-edition) ---------- */
  ok(typeof E.resumeRelances === "function", "moteur exporte resumeRelances");
  var rz0 = E.resumeRelances([]);
  ok(rz0.nombre === 0 && rz0.derniereDate === null, "resumeRelances([]) = 0 relance, aucune date");
  ok(E.resumeRelances(undefined).nombre === 0, "resumeRelances(undefined) tolere l'absence d'historique");
  ok(E.resumeRelances(null).nombre === 0, "resumeRelances(null) tolere null");
  var rz1 = E.resumeRelances([{ date: "2026-06-01", niveau: 2 }, { date: "2026-07-05", niveau: 3 }, { date: "2026-06-20", niveau: 2 }]);
  ok(rz1.nombre === 3, "resumeRelances compte toutes les relances");
  ok(rz1.derniereDate === "2026-07-05", "resumeRelances retourne la date la plus recente (max ISO)");
  var rz2 = E.resumeRelances([{ date: "pas-une-date" }, { date: "2026-05-10" }, {}]);
  ok(rz2.nombre === 3 && rz2.valides === 1 && rz2.derniereDate === "2026-05-10", "resumeRelances ignore les dates invalides pour derniereDate mais compte les entrees");
  ok(E.fmtDateFr(rz1.derniereDate) === "5" + NBSP + "juillet" + NBSP + "2026", "derniere relance formatable en date FR");

  /* ---------- 8e. Arithmetique de dates (echeancier + cadence) ---------- */
  ok(typeof E.addDaysISO === "function", "moteur exporte addDaysISO");
  ok(typeof E.addMonthsISO === "function", "moteur exporte addMonthsISO");
  ok(E.addDaysISO("2026-07-08", 7) === "2026-07-15", "addDaysISO +7 jours");
  ok(E.addDaysISO("2026-07-08", 0) === "2026-07-08", "addDaysISO +0 = identite");
  ok(E.addDaysISO("2026-07-31", 1) === "2026-08-01", "addDaysISO franchit la fin de mois");
  ok(E.addDaysISO("2026-12-31", 1) === "2027-01-01", "addDaysISO franchit la fin d'annee");
  ok(E.addDaysISO("2026-03-01", -1) === "2026-02-28", "addDaysISO recule sur fevrier (2026 non bissextile)");
  ok(E.addDaysISO("bad", 5) === null, "addDaysISO(entree invalide) = null");
  ok(E.addMonthsISO("2026-01-15", 1) === "2026-02-15", "addMonthsISO +1 mois");
  ok(E.addMonthsISO("2026-01-31", 1) === "2026-02-28", "addMonthsISO borne le jour au dernier du mois cible (31 jan -> 28 fev)");
  ok(E.addMonthsISO("2024-01-31", 1) === "2024-02-29", "addMonthsISO gere le 29 fevrier bissextile");
  ok(E.addMonthsISO("2026-11-30", 3) === "2027-02-28", "addMonthsISO franchit l'annee + borne le jour");
  ok(E.addMonthsISO("2026-07-15", 12) === "2027-07-15", "addMonthsISO +12 mois = meme jour, annee +1");
  ok(E.addMonthsISO("bad", 1) === null, "addMonthsISO(entree invalide) = null");

  /* ---------- 8f. Echeancier de paiement negocie (somme exacte = invariant) ---------- */
  ok(typeof E.genererEcheancier === "function", "moteur exporte genererEcheancier");
  var ech1 = E.genererEcheancier(150000, 3, "2026-07-08", "mensuel");
  ok(ech1.echeances.length === 3, "echeancier : 3 versements demandes");
  ok(ech1.somme === 150000 && ech1.exact === true, "echeancier : somme des versements = total exact (150000)");
  ok(ech1.echeances[0].montant === 50000 && ech1.echeances[2].montant === 50000, "echeancier : 150000/3 = 50000 par versement");
  ok(ech1.echeances[0].dateISO === "2026-07-08" && ech1.echeances[1].dateISO === "2026-08-08" && ech1.echeances[2].dateISO === "2026-09-08", "echeancier mensuel : dates espacees d'un mois");
  var ech2 = E.genererEcheancier(100000, 3, "2026-07-08", "mensuel");
  ok(ech2.somme === 100000 && ech2.exact === true, "echeancier : reste reparti, somme exacte (100000/3)");
  ok(ech2.echeances[0].montant === 33334 && ech2.echeances[1].montant === 33333 && ech2.echeances[2].montant === 33333, "echeancier : le reste (+1) va sur les premiers versements");
  var maxDelta = 0;
  ech2.echeances.forEach(function (e) { ech2.echeances.forEach(function (f) { maxDelta = Math.max(maxDelta, Math.abs(e.montant - f.montant)); }); });
  ok(maxDelta <= 1, "echeancier : ecart maximal entre versements <= 1 FCFA");
  var echW = E.genererEcheancier(70000, 4, "2026-07-08", "hebdomadaire");
  ok(echW.echeances[1].dateISO === "2026-07-15" && echW.echeances[3].dateISO === "2026-07-29", "echeancier hebdomadaire : dates espacees de 7 jours");
  var echQ = E.genererEcheancier(60000, 3, "2026-07-08", "quinzaine");
  ok(echQ.echeances[1].dateISO === "2026-07-22" && echQ.echeances[2].dateISO === "2026-08-05", "echeancier quinzaine : dates espacees de 14 jours");
  ok(E.genererEcheancier(150000, 1, "2026-07-08", "mensuel").echeances[0].montant === 150000, "echeancier a 1 versement = montant integral");
  ok(E.genererEcheancier(150000, 999, "2026-07-08", "mensuel").echeances.length === 24, "echeancier : nombre de versements plafonne a 24");
  ok(E.genererEcheancier(150000, 0, "2026-07-08", "mensuel").echeances.length === 1, "echeancier : minimum 1 versement");
  // property-test : sur de nombreux montants x nombres, la somme reconstitue TOUJOURS le total exact
  var pbOk = true, pbCount = 0;
  for (var pm = 0; pm <= 2000000; pm += 4999) {
    for (var pn = 1; pn <= 12; pn++) {
      var pe = E.genererEcheancier(pm, pn, "2026-07-08", "mensuel");
      pbCount++;
      if (pe.somme !== pm || !pe.exact) { pbOk = false; }
    }
  }
  ok(pbOk, "echeancier : invariant somme=total verifie sur " + pbCount + " combinaisons (montant x nombre)");
  var echA = E.genererEcheancier(150000, 3, "2026-07-08", "mensuel");
  var echB = E.genererEcheancier(150000, 3, "2026-07-08", "mensuel");
  ok(JSON.stringify(echA) === JSON.stringify(echB), "echeancier : generation deterministe");

  /* ---------- 8g. Message d'echeancier bilingue ---------- */
  ok(typeof E.genererMessageEcheancier === "function", "moteur exporte genererMessageEcheancier");
  var me = E.genererMessageEcheancier({
    nom: "Boutique Ndiaye", montant: 150000, nombre: 3, frequence: "mensuel", dateDebut: "2026-07-08",
    expediteur: "Ets Diallo", canalPaiement: "Wave ou Orange Money"
  });
  ok(me.fr && me.wo, "message echeancier : version FR + wolof");
  ok(me.fr.indexOf("échéancier") !== -1 && me.fr.indexOf("3 versements") !== -1, "message echeancier FR : mentionne l'echeancier et le nombre de versements");
  ok(me.fr.indexOf("50" + FINE + "000" + NBSP + "FCFA") !== -1, "message echeancier FR : montant de versement formate");
  ok(me.fr.indexOf("8" + NBSP + "juillet" + NBSP + "2026") !== -1 && me.fr.indexOf("8" + NBSP + "septembre" + NBSP + "2026") !== -1, "message echeancier FR : dates des versements");
  ok(me.fr.indexOf("Ets Diallo") !== -1, "message echeancier FR : signature");
  ok(/[éèàâêîôûùç]/.test(me.fr), "message echeancier FR accentue");
  ok(/[ëóñ]/.test(me.wo), "message echeancier wolof avec diacritiques");
  ok(!/garanti/i.test(me.fr + me.wo), "message echeancier : aucune promesse garantie");
  ok(!/[—–]/.test(me.fr + me.wo), "message echeancier : aucun tiret cadratin");
  // aucun chiffre invente : la somme des montants cites reconstitue le total du
  ok(me.plan.somme === 150000, "message echeancier : total des versements = dette exacte (aucun chiffre invente)");

  /* ---------- 8h. Cadence : prochaine relance conseillee ---------- */
  ok(typeof E.prochaineRelanceConseillee === "function", "moteur exporte prochaineRelanceConseillee");
  ok(E.prochaineRelanceConseillee(0, "2026-07-08").dateISO === "2026-07-11", "cadence niveau 0 : +3 jours");
  ok(E.prochaineRelanceConseillee(2, "2026-07-08").dateISO === "2026-07-15", "cadence niveau 2 : +7 jours");
  ok(E.prochaineRelanceConseillee(3, "2026-07-08").delai === 8, "cadence niveau 3 : +8 jours (aligne sur la mise en demeure)");
  ok(E.prochaineRelanceConseillee(4, "2026-07-08").dateISO === "2026-07-10", "cadence niveau 4 : +2 jours");
  ok(E.prochaineRelanceConseillee(9, "2026-07-08").delai === 2, "cadence : niveau hors plage borne au dernier niveau (2 jours)");
  ok(E.prochaineRelanceConseillee(2, "2026-07-08").dateFr === "15" + NBSP + "juillet" + NBSP + "2026", "cadence : date conseillee formatee en FR");
}

/* ---------- 9. Structure HTML / SEO / a11y ---------- */
ok(/<html lang="fr">/.test(html), "html lang=fr");
ok(/<meta charset="utf-8">/i.test(html), "charset utf-8");
ok(/<meta name="viewport"/.test(html), "meta viewport");
ok(/<title>[^<]{20,}<\/title>/.test(html), "title present et descriptif");
ok(/<meta name="description" content="[^"]{60,}"/.test(html), "meta description >= 60 caracteres");
ok(/property="og:title"/.test(html) && /property="og:description"/.test(html), "Open Graph title + description");
ok(/<header class="top">/.test(html) && /<main>/.test(html) && /<footer>/.test(html), "landmarks header/main/footer");
ok(/class="skip"/.test(html) && /href="#app"/.test(html), "lien d'evitement (skip link)");
ok(/aria-live="polite"/.test(html), "region live pour les notifications");
// chaque input/select a un label associe
const ids = (html.match(/<(?:input|select|textarea)[^>]*\bid="([^"]+)"/g) || []).map(function (s) {
  return (/id="([^"]+)"/.exec(s) || [])[1];
});
let tousLabels = ids.length > 0;
ids.forEach(function (id) { if (!new RegExp('for="' + id + '"').test(html)) { tousLabels = false; } });
ok(tousLabels, "chaque champ de formulaire a un <label for> (" + ids.length + " champs)");

/* ---------- 9bis. Reflow WCAG 1.4.10 (F-zoom200) ---------- */
ok(/<meta name="viewport"[^>]*content="[^"]*width=device-width/.test(html), "viewport width=device-width (adaptatif)");
ok(!/user-scalable\s*=\s*no/i.test(html), "viewport n'interdit pas le zoom (pas de user-scalable=no)");
ok(!/maximum-scale\s*=\s*(0?\.\d+|1(\.0+)?)\b/i.test(html), "viewport ne bride pas le zoom (pas de maximum-scale < 2)");
ok(/\.table-scroll\s*\{[^}]*overflow-x\s*:\s*auto/.test(html), "conteneur .table-scroll a overflow-x:auto (tableau defilable, WCAG 1.4.10)");
ok(/<div class="table-scroll"[^>]*>'[\s\S]{0,40}<table class="ech-table"/.test(html), "tableau d'echeancier enveloppe dans .table-scroll (pas de defilement horizontal du document)");
ok(/<div class="table-scroll"[^>]*\btabindex="0"[^>]*>/.test(html), "region defilable focalisable au clavier (WCAG 2.1.1, scrollable-region-focusable)");
ok(/<div class="table-scroll"[^>]*\baria-label="[^"]+"/.test(html), "region defilable a un nom accessible (aria-label)");
ok(/\.table-scroll:focus-visible\s*\{[^}]*outline/.test(html), "region defilable a un focus visible");

/* ---------- 10. JSON-LD valide ---------- */
const ld = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html);
ok(!!ld, "bloc JSON-LD present");
if (ld) {
  let parsed = null;
  try { parsed = JSON.parse(ld[1]); } catch (e) {}
  ok(parsed && parsed["@type"] === "SoftwareApplication", "JSON-LD parsable, type SoftwareApplication");
  ok(parsed && Array.isArray(parsed.featureList) && parsed.featureList.length >= 4, "JSON-LD liste de fonctionnalites");
}

/* ---------- 11. Hors-ligne : aucune ressource externe chargee ---------- */
ok(!/<link\b/i.test(html), "aucun <link> externe");
ok(!/<script[^>]+\bsrc=/i.test(html), "aucun <script src> externe");
ok(!/<img[^>]+src="https?:/i.test(html), "aucune image distante");
ok(!/url\(\s*['"]?https?:/i.test(html), "aucune ressource CSS distante (url())");
// CSP presente, connect-src limite aux deux fournisseurs IA optionnels
const csp = /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html);
ok(!!csp, "meta CSP presente");
if (csp) {
  ok(/default-src 'none'/.test(csp[1]), "CSP default-src 'none'");
  ok(/frame-ancestors 'none'/.test(csp[1]), "CSP anti-clickjacking (frame-ancestors 'none')");
  ok(/connect-src https:\/\/api\.groq\.com https:\/\/generativelanguage\.googleapis\.com/.test(csp[1]),
     "CSP connect-src limite a Groq + Gemini (IA optionnelle)");
}

/* ---------- 12. Honnetete verrouillee ---------- */
ok(/ne garantit aucun r[eé]sultat/i.test(html), "disclaimer : aucune garantie de resultat");
ok(/huissier/i.test(html) && /OHADA/i.test(html), "renvoi au cadre OHADA / huissier pour le recouvrement force");
ok(/hors-ligne|aucune donn[eé]e/i.test(html), "promesse de confidentialite (hors-ligne)");
ok(!/garantie de recouvrement|garantit le paiement|100 % de recouvrement/i.test(html), "aucune promesse de recouvrement garanti");
ok(!/t[eé]moignage|avis clients?|nos clients (disent|temoignent)|\d\s*\/\s*5\s*etoiles/i.test(html), "aucun temoignage/avis fabrique");
// vie privee IA : le fournisseur qui entraine est signale
ok(/entra[iî]ne sur les donn[eé]es|sans entra[iî]nement/i.test(html), "note de confidentialite sur le choix du fournisseur IA");

/* ---------- 13. Typographie : aucun tiret cadratin/demi-cadratin dans tout le fichier ---------- */
ok(!/[—–]/.test(html), "aucun tiret cadratin (U+2014) ni demi-cadratin (U+2013) dans le fichier");
// espace fine avant ':' = insecable (U+202F), jamais l'espace fine secable U+2009 (colon orphelin)
ok(html.indexOf(String.fromCharCode(0x2009)) === -1 && html.indexOf("&#8201;") === -1, "aucune espace fine secable U+2009 (typographie FR non-secable U+202F)");

/* ---------- 14. Contraste WCAG AA calcule sur les tokens reels des deux themes ---------- */
function relLum(hex) {
  var n = parseInt(hex.replace("#", ""), 16);
  var c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) {
    v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contraste(a, b) {
  var l1 = relLum(a), l2 = relLum(b);
  var hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}
function tokens(block) {
  var map = {}, re = /--([a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})/g, m;
  while ((m = re.exec(block))) { map[m[1]] = m[2]; }
  return map;
}
var AA = 4.5;
var rootStart = html.indexOf(":root{");
var rootBlock = html.slice(rootStart, html.indexOf("}", rootStart));
var darkIdx = html.indexOf("prefers-color-scheme: dark");
var darkRootStart = html.indexOf(":root{", darkIdx);
var darkRootBlock = html.slice(darkRootStart, html.indexOf("}", darkRootStart));
var light = tokens(rootBlock);
var darkOv = tokens(darkRootBlock);
var dark = Object.assign({}, light, darkOv);
ok(Object.keys(light).length >= 15, "tokens couleur du theme clair extraits (" + Object.keys(light).length + ")");
ok(!!(darkOv.bg && darkOv.text && darkOv.wa && darkOv["wa-ink"]), "tokens du theme sombre extraits (dont --wa-ink)");

function pair(theme, name, fg, bg, min, label) {
  var f = theme[fg], b = theme[bg];
  ok(f && b && contraste(f, b) >= min, label + " (" + (f && b ? contraste(f, b).toFixed(2) : "?") + " >= " + min + ")");
}
[["clair", light], ["sombre", dark]].forEach(function (T) {
  var nom = T[0], th = T[1];
  pair(th, nom, "text", "bg", AA, nom + ": texte/fond");
  pair(th, nom, "text", "surface", AA, nom + ": texte/carte");
  pair(th, nom, "muted", "bg", AA, nom + ": texte attenue/fond");
  pair(th, nom, "muted", "surface-2", AA, nom + ": texte attenue/surface-2");
  pair(th, nom, "brand-ink", "brand", AA, nom + ": encre marque/marque");
  pair(th, nom, "wa-ink", "wa", AA, nom + ": encre WhatsApp/bouton WhatsApp");
  pair(th, nom, "chip-ink", "chip", AA, nom + ": puce/fond puce");
  pair(th, nom, "warn-ink", "warn-bg", AA, nom + ": avertissement");
  pair(th, nom, "accent", "bg", AA, nom + ": lien accent/fond");
  pair(th, nom, "accent", "surface", AA, nom + ": lien accent/carte");
});
// badges d'escalade (couleurs figees dans .lvl1..4), lus depuis les regles CSS des deux themes
function decl(scope, selector, prop) {
  var i = scope.indexOf(selector + "{");
  if (i === -1) return null;
  var body = scope.slice(i + selector.length, scope.indexOf("}", i)); // commence par "{"
  var m = new RegExp("[;{]" + prop + "\\s*:\\s*(#[0-9a-fA-F]{6})").exec(body);
  return m ? m[1] : null;
}
var secondDark = html.indexOf("prefers-color-scheme: dark", darkIdx + 10);
var lvlLightScope = html.slice(0, secondDark);
var lvlDarkScope = html.slice(secondDark);
["lvl1", "lvl2", "lvl3", "lvl4"].forEach(function (s) {
  var lc = decl(lvlLightScope, "." + s, "color"), lb = decl(lvlLightScope, "." + s, "background");
  ok(lc && lb && contraste(lc, lb) >= AA, "clair: badge " + s + " (" + (lc && lb ? contraste(lc, lb).toFixed(2) : "?") + ")");
  var dc = decl(lvlDarkScope, "." + s, "color"), db = decl(lvlDarkScope, "." + s, "background");
  ok(dc && db && contraste(dc, db) >= AA, "sombre: badge " + s + " (" + (dc && db ? contraste(dc, db).toFixed(2) : "?") + ")");
});

/* ---------- 15. Chrome francais accentue (anti-regression F-accents-chrome) ---------- */
["impayés", "Sénégal", "commerçants", "réglages", "échéance", "français", "générer", "préventif", "téléphone", "données", "résultat", "délai"].forEach(function (w) {
  ok(html.indexOf(w) !== -1, "chrome accentue : presence de « " + w + " »");
});

/* ---------- 16. Motif ARIA des onglets de langue (F-tabs-a11y) ---------- */
ok(/setAttribute\("role",\s*"tabpanel"\)/.test(html), "panneau de message = role tabpanel");
ok(/setAttribute\("aria-controls",\s*"msg-"/.test(html), "chaque onglet a aria-controls vers son panneau");
ok(/ArrowRight|ArrowLeft/.test(html) && /"Home"/.test(html) && /"End"/.test(html), "navigation clavier des onglets (fleches + Home/End)");
ok(/b\.tabIndex\s*=\s*sel\s*\?\s*0\s*:\s*-1/.test(html), "tabindex mobile (roving) sur les onglets");

/* ---------- 17. Mise en demeure imprimable (fenetre + document + impression) ---------- */
ok(/id="mep-overlay"/.test(html) && /id="mep-doc"/.test(html), "fenetre de mise en demeure presente (overlay + document)");
ok(/role="dialog"/.test(html) && /aria-modal="true"/.test(html), "mise en demeure : dialogue ARIA modal");
ok(/id="mep-print"/.test(html) && /window\.print\(\)/.test(html), "bouton Imprimer / Enregistrer en PDF cable sur window.print()");
ok(/if \(e\.key === "Escape"\) \{ fermerMep\(\); return; \}/.test(html), "mise en demeure : fermeture au clavier (Echap)");
ok(/piege de focus/.test(html) && /e\.key === "Tab"/.test(html), "mise en demeure : piege de focus clavier (Tab boucle dans la fenetre)");
ok(/x\.niv >= 2/.test(html) && /ouvrirMiseEnDemeure\(d\)/.test(html), "bouton Mise en demeure affiche a partir du niveau 2");
ok(/@media print\{/.test(html) && /header\.top,main,footer,\.toast\{display:none/.test(html), "styles d'impression : masque l'appli, n'imprime que le document");
ok(/\.mep-overlay:not\(\.open\)\{display:none !important\}/.test(html), "impression : le document reste masque si la fenetre n'est pas ouverte");
ok(/id="s-lieu"/.test(html) && /for="s-lieu"/.test(html), "champ Ville (lieu d'emission) avec label");

/* ---------- 18. Edition + suivi des relances (F-edition) ---------- */
ok(/id="btn-submit"/.test(html) && /id="btn-cancel-edit"/.test(html), "formulaire : bouton d'envoi identifiable + bouton Annuler la modification");
ok(/function enterEdit\(d\)/.test(html) && /function exitEdit\(\)/.test(html), "mode edition : enterEdit/exitEdit definis");
ok(/editingRef\s*=\s*d/.test(html) && /if \(editingRef\)/.test(html), "soumission du formulaire : branche edition (met a jour au lieu d'ajouter)");
ok(/Enregistrer les modifications/.test(html), "libelle du bouton bascule en mode edition");
ok(/enterEdit\(d\)/.test(html) && /"Modifier"/.test(html), "bouton Modifier sur chaque carte impaye");
ok(/"Relance envoyée"/.test(html) && /d\.relances\.push\(\{ date: todayISO\(\)/.test(html), "bouton Relance envoyee : ajoute une entree datee a l'historique");
ok(/E\.resumeRelances\(d\.relances\)/.test(html) && /histEl\.className = "hist"/.test(html), "historique des relances affiche par client");
ok(/if \(editingRef === d\) exitEdit\(\)/.test(html), "supprimer un impaye en cours d'edition sort proprement du mode edition");
ok(/exitEdit\(\); state = \[\]/.test(html), "Tout effacer sort du mode edition avant de vider (pas de reference orpheline)");
ok(/"nb_relances"/.test(html) && /"derniere_relance"/.test(html), "export CSV enrichi : nombre et date de derniere relance");

/* ---------- 19. Accessibilite : taille de cible + mouvement reduit ---------- */
ok(/\.btn-sm\{[^}]*min-height:44px/.test(html), "taille de cible tactile : boutons .btn-sm >= 44px (WCAG 2.5.5)");
ok(/@media \(prefers-reduced-motion: reduce\)/.test(html), "respect de prefers-reduced-motion (CSS)");
ok(/function reduceMotion\(\)/.test(html) && /reduceMotion\(\)\s*\?\s*"auto"\s*:\s*"smooth"/.test(html), "defilement respecte prefers-reduced-motion (JS)");

/* ---------- 20. Echeancier de paiement + cadence de relance (F-rappels) ---------- */
ok(/function buildEcheancier\(wrap, d, x\)/.test(html), "UI : panneau d'echeancier (buildEcheancier) present");
ok(/Proposer un échéancier de paiement/.test(html), "UI : bouton d'ouverture de l'echeancier");
ok(/genererMessageEcheancier\(\{/.test(html), "UI : appel au moteur d'echeancier avec le contexte client");
ok(/E\.prochaineRelanceConseillee\(x\.niv, baseCad\)/.test(html), "UI : cadence de relance conseillee calculee par le moteur");
ok(/à relancer dès aujourd'hui/.test(html), "UI : invite a relancer si aucune relance notee et impaye echu");
ok(/if \(x\.niv >= 1\) buildEcheancier/.test(html), "UI : echeancier propose des qu'un retard apparait (niveau >= 1)");
ok(/class="ech-table"/.test(html) && /\.ech-table caption/.test(html), "UI : tableau d'echeancier stylise (avec legende)");
ok(/Proposition d'échéancier de paiement négocié/.test(html), "SEO/JSON-LD : fonctionnalite echeancier listee");
ok(/échéancier de paiement négocié/.test(html) && /cadence de relance conseillée/i.test(html), "chrome : section explicative de l'echeancier et de la cadence");

/* ---------- 21. Couche IA : garde-fou de sortie et appel robuste (F-ai-garde, c65) ---------- */
// La logique fine est prouvee par `node docs/ia-c65.js` (136 controles, fetch simule).
// Ici on verrouille la STRUCTURE : que le garde-fou existe, qu'il soit branche, et qu'aucune
// regression ne le contourne (le moteur ne doit jamais afficher une sortie de modele non verifiee).
if (E) {
  ok(typeof E.verifierSortieIA === "function", "moteur exporte verifierSortieIA (garde-fou)");
  ok(typeof E.appelerIA === "function", "moteur exporte appelerIA (appel robuste)");
  ok(typeof E.construirePromptIA === "function", "moteur exporte construirePromptIA");
  ok(typeof E.resumeViolations === "function", "moteur exporte resumeViolations");

  const c = { nom: "Ndiaye", montant: 150000, echeance: "2026-05-22", relation: "habituel",
              expediteur: "Diallo", canalPaiement: "Wave", aujourdhui: "2026-07-09" };
  const g = E.genererMessage(c);
  const base = g.fr + "\n\n" + g.wo;
  const o = { nom: c.nom, montant: c.montant, dateFr: g.dateFr, canal: c.canalPaiement, expediteur: c.expediteur };
  const ins = (ph) => { const i = base.indexOf("\n" + c.expediteur); return base.slice(0, i) + " " + ph + base.slice(i); };

  ok(E.verifierSortieIA(base, base, o).ok === true, "garde-fou : le message du moteur passe son propre controle");
  ok(E.verifierSortieIA(base, "", o).ok === false, "garde-fou : reponse vide refusee");
  ok(E.verifierSortieIA(base, ins("Payez sous 5 jours."), o).ok === false, "garde-fou : nombre invente refuse");
  ok(E.verifierSortieIA(base, ins("J'appelle la police."), o).ok === false, "garde-fou : menace refusee");
  ok(E.verifierSortieIA(base, ins("Je vous garantis un accord."), o).ok === false, "garde-fou : promesse refusee");
  ok(E.verifierSortieIA(base, ins("Payez sur https://x.example"), o).ok === false, "garde-fou : lien refuse");
  ok(E.verifierSortieIA(base, base.split("150" + FINE + "000").join("180" + FINE + "000"), o).ok === false, "garde-fou : montant modifie refuse");
  ok(E.verifierSortieIA(base, base.split("mai").join("juin"), o).ok === false, "garde-fou : date modifiee refusee");
  ok(E.verifierSortieIA(base, base.split("\n" + c.expediteur).join(""), o).ok === false, "garde-fou : signature supprimee refusee");
  ok(E.verifierSortieIA(base, g.fr, o).ok === false, "garde-fou : partie wolof supprimee refusee");
  ok(E.verifierSortieIA(base, ins("Le processus suit son cours."), o).ok === true, "garde-fou : « processus » n'est pas un faux positif de « proces »");
  ok(E.resumeViolations(E.verifierSortieIA(base, "", o).violations).indexOf("IA_") === -1, "garde-fou : le motif rendu a l'utilisateur n'expose aucun code technique");

  // Modeles alignes sur le socle _core/llm de l'axe (ARCHITECTURE.md section 4)
  ok(E.IA_MODELES.groq[0] === "openai/gpt-oss-20b", "modele Groq par defaut aligne sur _core/llm");
  ok(E.IA_MODELES.groq.length >= 2, "un modele de repli Groq est prevu (retrait de catalogue)");

  // Cascade Gemini : verrous poses au c65 apres constat REEL (docs/ia-live-c65.mjs).
  // Un fournisseur gratuit retire ses modeles sans preavis et sature : un modele unique = panne.
  ok(E.IA_MODELES.gemini.length >= 2, "un modele de repli Gemini est prevu (le repli 404/503 doit avoir une cible)");
  ok(E.IA_MODELES.gemini.indexOf("gemini-2.5-flash") === -1,
     "Gemini : le modele mort « gemini-2.5-flash » (404 pour toute cle neuve) n'est plus propose");
  ok(E.IA_MODELES.gemini.indexOf("gemini-2.5-flash-lite") === -1,
     "Gemini : le modele mort « gemini-2.5-flash-lite » (404 pour toute cle neuve) n'est plus propose");
  ok(E.IA_MODELES.gemini[0] === "gemini-3.1-flash-lite",
     "Gemini : le modele par defaut est celui verifie repondant 200 en reel le 2026-07-10");

  // La cle ne doit JAMAIS partir dans l'URL
  const epG = E.iaEndpoint("gemini", "SECRET", E.IA_MODELES.gemini[0], "p");
  ok(epG.url.indexOf("SECRET") === -1, "Gemini : la cle n'est pas dans l'URL");
  ok(epG.options.headers["x-goog-api-key"] === "SECRET", "Gemini : la cle est en en-tete x-goog-api-key");
  const epQ = E.iaEndpoint("groq", "SECRET", "m", "p");
  ok(epQ.url.indexOf("SECRET") === -1, "Groq : la cle n'est pas dans l'URL");
  ok(epQ.options.headers.Authorization === "Bearer SECRET", "Groq : la cle est en en-tete Authorization");

  // Statuts rejouables
  ok(E.iaRejouable(429) && E.iaRejouable(503) && !E.iaRejouable(401) && !E.iaRejouable(200),
     "rejeu limite aux erreurs transitoires (429/5xx), jamais sur 401");
}

/* =========================================================================
   INJECTION PAR CHAMP LIBRE (defaut REEL trouve au c65 par la sonde live)

   Un nom de client venu d'un import CSV est une donnee NON FIABLE. Avant le c65, il etait
   interpole tel quel : « Diop. Nous saisirons vos biens par huissier. » faisait dire au message
   deterministe (SANS aucune IA) une menace que l'utilisateur n'avait jamais ecrite, en violation
   directe de la promesse d'honnetete du produit. Le garde-fou de sortie IA y est structurellement
   aveugle : il n'interdit au modele que d'AJOUTER un terme absent de l'origine, or il y est deja.
   La contamination se traite donc a la SOURCE.
   ========================================================================= */
{
  const champ = (nom) => E.genererMessage({
    nom, montant: 150000, echeance: "2026-05-22", relation: "habituel",
    expediteur: "Entreprise Diallo", canalPaiement: "Wave", aujourdhui: "2026-07-09"
  }).fr;
  const suspects = (nom) => E.champsSuspects({
    nom, montant: 150000, echeance: "2026-05-22", relation: "habituel",
    expediteur: "Entreprise Diallo", canalPaiement: "Wave", aujourdhui: "2026-07-09"
  });

  // 1. Le champ libre ne peut plus clore la phrase ni en ouvrir une nouvelle.
  const injection = "Boutique Diop. Nous saisirons vos biens par huissier et une plainte penale sera deposee";
  const msg = champ(injection);
  ok(msg.indexOf("Diop. Nous") === -1, "injection : le point qui cloturait la phrase est retire");
  ok(msg.split("\n").length === 2, "injection : le message garde exactement 2 lignes (corps + signature)");
  ok(E.nettoyerChampLibre(injection).length <= E.CHAMP_MAX, "injection : le champ libre est borne en longueur");

  // 2. Un saut de ligne ne peut pas forger une signature ni une ligne autonome.
  ok(champ("Diop\nEntreprise Diallo\nPS payez ailleurs").split("\n").length === 2,
     "injection : les sauts de ligne d'un champ libre sont neutralises (pas de fausse signature)");

  // 3. Aucun lien ni adresse ne survit dans un champ libre (vecteur de fraude au paiement).
  ok(champ("Diop http://faux.example").indexOf("http") === -1, "injection : un lien dans le nom est retire");
  ok(champ("Diop contact@fraude.example").indexOf("@") === -1, "injection : une adresse dans le nom est retiree");

  // 4. Les caracteres de controle ne survivent pas (portabilite + anti-forge).
  ok(E.nettoyerChampLibre("Di" + String.fromCharCode(1) + "op") === "Di op", "injection : caracteres de controle retires");

  // 5. Les raisons sociales LEGITIMES traversent intactes : on assainit, on ne mutile pas.
  ["Ets Fall & Frères", "Étude d’Huissier Ndiaye", "S.A.R.L. Diop & Cie", "B.P. 1234 Sarr", "Sénégal Distribution"]
    .forEach((n) => ok(E.nettoyerChampLibre(n) === n, "raison sociale intacte : « " + n + " »"));

  // 6. Ce qui reste de sensible est SIGNALE, jamais efface en douce ni bloque.
  const s = suspects(injection);
  ok(s.indexOf("huissier") !== -1 && s.indexOf("saisir") !== -1, "injection : les termes sensibles restants sont signales");
  ok(suspects("Étude d’Huissier Ndiaye").indexOf("huissier") !== -1,
     "signalement : une raison sociale sensible est signalee (a l'humain de trancher), jamais bloquee");
  ok(suspects("Clinique Teranga").length === 0, "signalement : aucun faux positif sur un nom ordinaire");
  ok(suspects("Boutique Ndiaye").length === 0, "signalement : le gabarit du message ne se signale jamais lui-meme");

  // 7. Les trois generateurs assainissent, pas seulement celui des relances.
  const mep = E.genererMiseEnDemeure({ nom: "Diop\nFaux", montant: 1000, echeance: "2026-01-01", expediteur: "E", aujourdhui: "2026-07-09" });
  ok(mep.destinataire === "Diop Faux", "mise en demeure : le nom est assaini (saut de ligne neutralise)");
  ok(JSON.stringify(mep).indexOf("Diop\\nFaux") === -1, "mise en demeure : aucun saut de ligne injecte ne survit");
  ok(E.genererMessageEcheancier({ nom: "Diop\nFaux", montant: 90000, nombre: 3, dateDebut: "2026-08-01", frequence: "mensuel", expediteur: "E", aujourdhui: "2026-07-09" })
       .fr.indexOf("Diop\nFaux") === -1, "echeancier : le nom est assaini");
}

// Cablage UI de l'avertissement de champ contamine
ok(/E\.champsSuspects\(ctx\(d\)\)/.test(html), "UI : chaque impaye rendu est teste pour contamination de champ");
  ok(/champ-suspect/.test(html) && /alerteEl\.setAttribute\("role", "status"\)/.test(html),
   "UI : l'avertissement est une information (role=status), pas une erreur bloquante");

// Cablage dans l'interface : la sortie du modele ne peut pas atteindre l'ecran sans controle
ok(/E\.verifierSortieIA\(base, txt, o\)/.test(html), "UI : la reponse du modele passe par le garde-fou avant affichage");
ok(/if \(!v\.ok\)/.test(html) && /refusEl\.hidden = false/.test(html), "UI : une reecriture non conforme est refusee et le motif affiche");
ok(/d\.ia = \{ texte: txt, langue: langue, base: base \}/.test(html), "UI : seule une reecriture validee est enregistree");
ok(/var waText = texteCourant/.test(html), "UI : WhatsApp et Copier envoient exactement le texte affiche (pas le texte deterministe)");
ok(/if \(waBtn\) waBtn\.href = E\.lienWhatsapp\(d\.tel, t\)/.test(html), "UI : le lien WhatsApp est tenu a jour au rendu (copie du lien fiable)");
ok(/function iaTexte\(\)/.test(html) && /d\.ia\.base === det/.test(html), "UI : une reecriture perimee (impaye modifie, langue changee) est ignoree");
ok(/setAttribute\("role", "alert"\)/.test(html), "UI : le motif de refus est annonce (role=alert)");
ok(/Revenir au message d'origine/.test(html), "UI : retour au message deterministe possible");
ok(/msgEl\.focus\(\)/.test(html), "UI : le focus n'est pas perdu quand le bouton de retour se masque");
ok(/id="ai-remember"/.test(html) && /for="ai-remember"/.test(html), "UI : case « se souvenir de ma cle » avec label associe");
ok(/save\(LS_AI, \{ prov: ai\.prov, key: ai\.remember \? ai\.key : "", remember: ai\.remember \}\)/.test(html),
   "securite : la cle n'est persistee que si l'utilisateur l'a explicitement demande, et est effacee sinon");
ok(!/generateContent\?key=/.test(html), "securite : aucune cle passee en parametre d'URL (anti-fuite Referer)");
ok(!/llama-3\.3-70b-versatile"\s*,\s*$/m.test(html) || /openai\/gpt-oss-20b/.test(html), "modele Groq principal present");
ok(/rel = "noopener noreferrer"/.test(html), "securite : liens WhatsApp sans fuite de Referer");
ok(/\[hidden\]\{display:none !important\}/.test(html), "UI : l'attribut hidden est respecte meme sur les elements en display:flex");
ok(/Garde-fou&#8239;:/.test(html), "chrome : le garde-fou est expose a l'utilisateur (argument de vente et de confiance)");
ok(/contrôlée <strong>mécaniquement, sans IA<\/strong>/.test(html), "chrome : la promesse dit explicitement que le controle est mecanique");

/* ---------- Honnetete de la promesse de confidentialite (defaut reel c65) ----------
   Depuis que l'option IA existe, une promesse ABSOLUE « aucune donnee ne quitte votre telephone »
   est conditionnellement fausse : quand l'utilisateur active l'IA, le nom, le montant et le
   message partent chez le fournisseur choisi. CHAQUE occurrence de la promesse doit porter la
   nuance ; on interdit toute regression vers l'absolu. */
ok(/og:description" content="[^"]*sans l'option IA[^"]*"/.test(html),
   "honnetete : la promesse hors-ligne de l'Open Graph est conditionnee a l'option IA");
ok(/sans l'option IA \(d[eé]sactiv[eé]e par d[eé]faut\)/.test(html),
   "honnetete : la description JSON-LD conditionne la promesse hors-ligne (IA desactivee par defaut)");
ok(/sauf si vous activez l'option IA/.test(html),
   "honnetete : le panneau donnees conditionne « rien ne quitte votre telephone » a l'option IA");
ok(!/Fonctionne hors-ligne, aucune donn[eé]e ne quitte/.test(html),
   "honnetete : plus aucune promesse hors-ligne ABSOLUE non conditionnee (formulation ancienne bannie)");
ok(/envoyés au fournisseur choisi/.test(html),
   "honnetete : la divulgation IA precise ce qui part (nom, montant, message) et vers qui");

/* ---------- 12. Couche DEMO PUBLIQUE (bloc DEMO_START, evalue en Node) ----------
   Ajoutee le 2026-08-15 avec le portage du moteur verifie vers la demo publiee. Le plafond,
   l'amorcage et les dossiers fictifs sont du CODE, donc ils se prouvent comme du code : la
   version precedente de la demo promettait des fonctions absentes precisement parce que rien
   n'executait sa couche d'accueil. */
const dStart = html.indexOf("/*DEMO_START*/");
const dEnd = html.indexOf("/*DEMO_END*/");
ok(dStart !== -1 && dEnd !== -1 && dEnd > dStart, "bornes /*DEMO_START*/ et /*DEMO_END*/ presentes");
let D = null;
try {
  D = (0, eval)(html.slice(dStart, dEnd) + "\n;FAYNA_DEMO");
} catch (e) {
  ok(false, "eval de la couche demo sans erreur (" + e.message + ")");
}
ok(D && typeof D.decisionAmorcage === "function", "couche demo exporte decisionAmorcage");

if (D) {
  /* Plafond : la frontiere annoncee au visiteur doit etre CELLE QUI S'APPLIQUE. */
  ok(D.PLAFOND === 5, "plafond de la demo = 5 dossiers (trouve " + D.PLAFOND + ")");
  ok(html.indexOf("5 dossiers au maximum") !== -1, "le bandeau annonce le plafond au visiteur");
  ok(html.indexOf("plafonnée à " + D.PLAFOND + " dossiers") !== -1,
    "le formulaire annonce le MEME plafond que le code (" + D.PLAFOND + ")");

  /* Le plafond mord, et il mord au bon endroit : 4 passe, 5 bloque. (LECON 16 : tester la
     CONSEQUENCE, pas la presence de la constante.) */
  ok(D.peutAjouter(0) === true, "plafond : un 1er dossier est acceptable");
  ok(D.peutAjouter(4) === true, "plafond : le 5e dossier est acceptable (4 en base)");
  ok(D.peutAjouter(5) === false, "plafond : le 6e dossier est refuse (5 en base)");
  ok(D.peutAjouter(9) === false, "plafond : refus au-dela aussi");
  ok(D.placesLibres(0) === 5 && D.placesLibres(3) === 2, "places libres calculees juste");
  ok(D.placesLibres(7) === 0, "places libres jamais negatives (LECON 17 : un debordement ne passe pas mieux qu'un vide)");

  /* Amorcage : le piege reel est « Tout effacer » annule par un re-amorcage au rechargement. */
  var a1 = D.decisionAmorcage(false, 0);
  ok(a1.poserMarqueur === true && a1.semer === true, "1re visite, liste vide : on marque ET on seme");
  var a2 = D.decisionAmorcage(false, 2);
  ok(a2.poserMarqueur === true && a2.semer === false, "1re visite avec des donnees deja la : on marque, on ne SEME PAS");
  var a3 = D.decisionAmorcage(true, 0);
  ok(a3.poserMarqueur === false && a3.semer === false,
    "apres « Tout effacer » puis rechargement : la liste RESTE vide (aucun re-amorcage)");
  var a4 = D.decisionAmorcage(true, 3);
  ok(a4.poserMarqueur === false && a4.semer === false, "visite suivante avec donnees : rien n'est touche");

  /* Donnees fictives : trois dossiers, trois niveaux d'escalade differents, dates relatives. */
  var fict = D.dossiersFictifs("2026-08-15");
  ok(Array.isArray(fict) && fict.length === 3, "3 dossiers fictifs pre-charges (trouve " + (fict || []).length + ")");
  ok(fict.length <= D.PLAFOND, "l'amorcage ne depasse jamais le plafond qu'il annonce");
  var niveaux = fict.map(function (d) { return E.niveau(E.joursRetard(d.echeance, "2026-08-15")); });
  ok(new Set(niveaux).size === 3, "les 3 dossiers fictifs illustrent 3 niveaux d'escalade distincts (" + niveaux.join(",") + ")");
  var fictPlusTard = D.dossiersFictifs("2027-01-20");
  ok(fictPlusTard[0].echeance !== fict[0].echeance,
    "les echeances fictives suivent le jour de la visite (la demo ne vieillit pas toute seule)");
  ok(fict.every(function (d) { return E.joursRetard(d.echeance, "2026-08-15") > 0; }),
    "chaque dossier fictif est reellement en retard le jour de la visite");
  /* Aucun numero fictif ne doit ressembler au numero reel de la maison : un visiteur qui clique
     « Envoyer sur WhatsApp » depuis la demo ne doit joindre personne. */
  ok(fict.every(function (d) { return String(d.tel).replace(/\D/g, "").indexOf("784266546") === -1; }),
    "aucun dossier fictif ne porte le numero reel de Jaayleer");
}

/* ---------- 13. Export CSV : le CONTENU, pas le libelle des colonnes ----------
   Trouve par la revue QA adverse du 2026-08-15 : le controle precedent verifiait la presence
   litterale des entetes « nb_relances » et « derniere_relance » dans le HTML. En vidant la
   boucle qui remplit les lignes, l'export ne sortait plus que l'entete et l'oracle restait vert.
   On teste desormais le tableau REELLEMENT produit. */
if (E && typeof E.lignesCSV === "function") {
  const jeu = [
    { nom: "Boutique Ndiaye", tel: "771234567", montant: 150000, echeance: "2026-07-24", paye: false, relances: [] },
    { nom: 'Ets "Fall"; & Frères', tel: "", montant: 640000, echeance: "2026-06-29", paye: true, relances: [{ date: "2026-07-26", niveau: 2 }] }
  ];
  const lignes = E.lignesCSV(jeu, "2026-08-15");
  ok(lignes.length === 3, "CSV : une ligne d'entete + une ligne PAR dossier (trouve " + lignes.length + ")");
  ok(lignes[0].length === 9 && lignes[0][0] === "nom", "CSV : 9 colonnes, entete en tete");
  ok(lignes.every((l) => l.length === lignes[0].length), "CSV : toutes les lignes ont le meme nombre de colonnes");
  ok(lignes[1][0] === "Boutique Ndiaye" && String(lignes[1][2]) === "150000", "CSV : le nom et le montant du dossier sortent vraiment");
  ok(Number(lignes[1][4]) === E.joursRetard("2026-07-24", "2026-08-15"), "CSV : les jours de retard sont CALCULES, pas vides");
  ok(lignes[1][5] === E.NIVEAUX[E.niveau(E.joursRetard("2026-07-24", "2026-08-15"))].labelFr, "CSV : le niveau d'escalade est celui du moteur");
  ok(lignes[2][6] === "oui" && lignes[1][6] === "non", "CSV : l'etat paye/non paye est rendu");
  ok(Number(lignes[2][7]) === 1, "CSV : le nombre de relances est compte");
  ok(E.lignesCSV([], "2026-08-15").length === 1, "CSV : liste vide = entete seule, jamais une erreur");
  ok(E.lignesCSV(null, "2026-08-15").length === 1, "CSV : entree absente traitee comme vide (LECON 17)");

  const texte = E.serialiserCSV(lignes);
  const lignesTexte = texte.split("\r\n");
  ok(lignesTexte.length === 3, "CSV serialise : 3 lignes separees par CRLF");
  ok(lignesTexte[0] === "nom;whatsapp;montant_fcfa;echeance;jours_retard;niveau;paye;nb_relances;derniere_relance",
    "CSV serialise : entete exacte, separateur point-virgule");
  ok(lignesTexte[1].indexOf("Boutique Ndiaye") !== -1, "CSV serialise : la donnee du dossier est bien dans le texte");
  ok(lignesTexte[2].indexOf('"Ets ""Fall""; & Frères"') !== -1,
    "CSV serialise : guillemets doubles et point-virgule echappes (une raison sociale ne casse pas le fichier)");
  ok(E.serialiserCSV([["a"]]) === "a", "CSV serialise : cas minimal sans echappement inutile");
}

/* ---------- 14. Cliquet sur la zone que Node n'execute JAMAIS ----------
   La revue QA adverse du 2026-08-15 a mis le doigt sur un defaut structurel, pas ponctuel : tout
   ce qui vit apres /*DEMO_END*​/ est garde par `if (typeof document === "undefined") return;`,
   donc aucun harnais ne l'execute. Ce cycle en a sorti l'export CSV. Le reste (cablage DOM,
   rendu, ecouteurs) y demeure et reste NON PROUVE — c'est ecrit tel quel dans DECISIONS.md.
   Faute de pouvoir tout extraire aujourd'hui, on pose un cliquet : cette zone ne doit plus
   GROSSIR. Toute logique metier ajoutee la fera echouer l'oracle, ce qui force a l'extraire
   vers un bloc testable au lieu de l'enfouir dans un gestionnaire de clic. */
const BUDGET_ZONE_NON_TESTEE = 27500; // octets. Mesure du 2026-08-15 : 27 299. Ne JAMAIS relever
                                      // ce plafond pour faire passer un ajout : extraire le code.
const zoneDebut = html.indexOf("/*DEMO_END*/");
const zoneFin = html.lastIndexOf("</script>");
ok(zoneDebut !== -1 && zoneFin > zoneDebut, "bornes de la zone DOM identifiables");
const tailleZone = zoneDebut === -1 ? -1 : Buffer.byteLength(html.slice(zoneDebut, zoneFin), "utf8");
ok(tailleZone > 0 && tailleZone <= BUDGET_ZONE_NON_TESTEE,
  "zone DOM non executee par Node sous son plafond (" + tailleZone + " / " + BUDGET_ZONE_NON_TESTEE + " octets)");
// Et le calcul du CSV n'y est PLUS : preuve que l'extraction de ce cycle n'a pas ete defaite.
const zoneDom = zoneDebut === -1 ? "" : html.slice(zoneDebut, zoneFin);
ok(zoneDom.indexOf("nb_relances") === -1,
  "le calcul de l'export CSV a quitte la zone non testee (il est dans le moteur)");
ok(/E\.serialiserCSV\(E\.lignesCSV\(/.test(zoneDom),
  "le gestionnaire de clic delegue l'export au moteur teste");

/* ---------- Rapport ---------- */
console.log("");
console.log("FAYNA oracle : " + pass + " verts, " + fail + " rouges, " + warn + " avertissement(s).");
if (fail) {
  console.log("\nECHECS :");
  fails.forEach(function (f) { console.log("  x " + f); });
  process.exit(1);
}
console.log("Tout est vert. Exit 0.");
process.exit(0);
