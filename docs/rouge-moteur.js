#!/usr/bin/env node
/**
 * Auto-test de l'oracle moteur : prouve que `docs/verifier-fayna.js` SAIT virer au rouge.
 *
 *   node docs/rouge-moteur.js
 *
 * Pourquoi ce fichier existe. Le 2026-08-15, l'oracle herite (351 assertions) a ete rejoue et
 * il etait vert — mais un oracle vert ne prouve rien tant qu'on n'a pas montre qu'il peut virer
 * au rouge (LECON 18 du cerveau). Chaque mutation ci-dessous casse UN invariant du produit ; si
 * l'oracle la laisse passer, c'est un TROU et ce script sort en 1.
 *
 * Les mutations portent en priorite sur ce qui a ete ajoute le 2026-08-15 (couche demo publique,
 * retrait de l'auto-certification juridique), la ou le harnais n'avait encore jamais ete eprouve.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const SOURCE = path.join(ROOT, "demo.html");
const TEMPORAIRE = "demo.__rouge.html";
const CIBLE = path.join(ROOT, TEMPORAIRE);

const original = fs.readFileSync(SOURCE, "utf8");

/** [nom, mutation]. Une mutation qui ne change RIEN est elle-meme un echec : on le detecte. */
const mutations = [
  ["plafond du code desaccorde du plafond annonce (5 -> 7)",
    (h) => h.replace("var PLAFOND = 5;", "var PLAFOND = 7;")],

  ["plafond decale d'une unite (< devient <=)",
    (h) => h.replace("return Number(nb) < PLAFOND;", "return Number(nb) <= PLAFOND;")],

  ["« Tout effacer » annule par un re-amorcage au rechargement",
    (h) => h.replace("semer: !dejaAmorce && Number(nbDossiers) === 0", "semer: Number(nbDossiers) === 0")],

  ["places libres devenues negatives (garde Math.max retiree)",
    (h) => h.replace("return Math.max(0, PLAFOND - Number(nb));", "return PLAFOND - Number(nb);")],

  ["auto-certification juridique reintroduite dans la mise en demeure",
    (h) => h.replace('"Par la présente, nous vous mettons en demeure de régler cette " +',
      '"Par la présente, et conformément à l\'Acte uniforme OHADA, nous vous mettons en demeure de régler cette " +')],

  // `\r?\n` et non `\n` : sur Windows, git livre le fichier en CRLF selon la branche d'ou l'on
  // arrive, et la mutation devenait INERTE — elle ne modifiait rien et comptait comme un succes.
  ["un dossier fictif supprime (2 au lieu de 3)",
    (h) => h.replace(/\{ nom: "Restaurant Teranga".*?\}\r?\n/s, "")],

  ["numero reel de Jaayleer glisse dans un dossier fictif",
    (h) => h.replace('tel: "771234567"', 'tel: "784266546"')],

  ["echeance fictive figee dans le temps (la demo vieillit toute seule)",
    (h) => h.replace("echeance: minus(22)", 'echeance: "2026-07-24"')],

  ["promesse hors-ligne redevenue absolue",
    (h) => h.replace(/sauf si vous activez l'option IA/g, "et rien d'autre")],

  // --- Mutations de l'export CSV. La premiere est LA mutation exacte que la revue QA adverse
  // du 2026-08-15 a fait passer inapercue : l'export ne sortait plus que les entetes, pour tous
  // les visiteurs, et l'oracle restait a 374/374. Elle doit desormais virer au rouge.
  ["export CSV vide de ses lignes (entete seule)",
    (h) => h.replace("(Array.isArray(dossiers) ? dossiers : []).forEach", "[].forEach")],

  ["une colonne CSV disparait",
    (h) => h.replace('"nb_relances", "derniere_relance"', '"derniere_relance"')],

  ["echappement CSV casse (une raison sociale avec ; casse le fichier)",
    (h) => h.replace('return /[",;\\n]/.test(s) ? \'"\' + s.replace(/"/g, \'""\') + \'"\' : s;', "return s;")],

  ["jours de retard non calcules dans l'export",
    (h) => h.replace("var jr = joursRetard(d.echeance, aujourdhui);", "var jr = 0;")],
];

let attrapees = 0;
let echecs = [];

function lancerOracle() {
  try {
    execFileSync(process.execPath, [path.join(__dirname, "verifier-fayna.js"), TEMPORAIRE],
      { cwd: ROOT, stdio: "pipe" });
    return 0;
  } catch (e) {
    return typeof e.status === "number" ? e.status : 1;
  }
}

try {
  // Controle de sanite : sans mutation, l'oracle doit etre VERT sur la copie. Sinon tout le
  // reste de ce script mesurerait le mauvais phenomene.
  fs.writeFileSync(CIBLE, original, "utf8");
  if (lancerOracle() !== 0) {
    console.log("  [FATAL] l'oracle est deja rouge sur la copie non mutee : rien n'est mesurable.");
    process.exit(1);
  }
  console.log("  [temoin] copie non mutee : oracle vert.\n");

  for (const [nom, muter] of mutations) {
    const mute = muter(original);
    if (mute === original) {
      console.log("  [MUTATION INERTE] " + nom + " -> le texte cible n'existe plus dans demo.html");
      echecs.push(nom + " (mutation inerte)");
      continue;
    }
    fs.writeFileSync(CIBLE, mute, "utf8");
    if (lancerOracle() !== 0) {
      attrapees++;
      console.log("  [rouge OK] " + nom);
    } else {
      console.log("  [TROU]     " + nom + " NON DETECTEE");
      echecs.push(nom);
    }
  }
} finally {
  if (fs.existsSync(CIBLE)) fs.unlinkSync(CIBLE);
}

console.log("\nMutations attrapees : " + attrapees + "/" + mutations.length);
if (echecs.length) {
  console.log("Trous :");
  echecs.forEach((e) => console.log("  x " + e));
  process.exit(1);
}
process.exit(0);
