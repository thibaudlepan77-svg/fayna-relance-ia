#!/usr/bin/env node
/**
 * Harnais DOM de FAYNA — il EXECUTE la demo publique et clique dedans.
 *
 *   node verifier-dom.js            joue les scenarios sur demo.html tel quel
 *   node verifier-dom.js --rouge    auto-test : mute le cablage et exige le rouge
 *
 * POURQUOI CE FICHIER EXISTE
 * --------------------------
 * Le 2026-08-15, une revue QA adverse a montre que TOUT ce qui suit la borne /*DEMO_END* / de
 * demo.html — environ 600 lignes, soit le cablage complet de l'interface — n'etait execute par
 * AUCUN harnais : le code est garde par `if (typeof document === "undefined") return;`, donc
 * inerte sous Node. En vidant la boucle de l'export CSV, l'oracle restait vert a 374/374 alors
 * que la demo publique livrait un fichier sans une seule ligne de donnees (LECON 19 du cerveau).
 * La reponse d'alors fut un cliquet de taille : un plafond d'octets qui empeche la zone de
 * grossir. Un cliquet n'est pas une preuve, c'est un aveu — il gele le risque, il ne le leve pas.
 *
 * Ce harnais leve le risque : il charge demo.html dans un vrai DOM (jsdom), laisse la page
 * s'executer comme chez un visiteur, puis clique sur les VRAIS boutons et lit le DOM rendu.
 * Aucune ligne du produit n'a ete recrite pour se rendre testable.
 *
 * REGLES DU CERVEAU APPLIQUEES
 *  - n8  : sortie 1 ferme, aucun controle conditionnel qui se saute en silence.
 *  - n10 : pas de preuve outillee, pas de gain.
 *  - n18 : le harnais est prouve capable de virer au rouge (--rouge).
 *  - n19 : on ne verifie pas le LIBELLE d'une colonne, on verifie qu'elle est REMPLIE.
 *  - n21 : une mutation qui ne modifie rien est un ECHEC, jamais un succes.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const ROOT = __dirname;
const FICHIER = path.join(ROOT, "demo.html");
const ROUGE = process.argv.includes("--rouge");

/* =========================================================================================
   1. Socle : charger la demo dans un DOM reel, avec le minimum d'instruments
   ========================================================================================= */

/**
 * Ce que jsdom n'implemente pas et que la page utilise vraiment. On instrumente le NAVIGATEUR,
 * jamais le produit : le code de demo.html est charge tel qu'il est publie.
 *  - URL.createObjectURL / Blob : jsdom ne les relie pas. On les remplace par un couple qui
 *    CAPTURE le contenu telecharge — c'est ce qui permet de lire le CSV reellement produit.
 *  - scrollIntoView, print, confirm, clipboard : non implementes par jsdom, ils feraient
 *    planter le clic avant l'assertion.
 */
function charger(html, options) {
  options = options || {};
  const erreurs = [];
  const capturesCSV = [];
  const appelsReseau = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => {
    // La seule erreur attendue : le clic sur le lien de telechargement declenche une navigation,
    // que jsdom n'implemente pas. Toute autre erreur est un vrai bug de la page.
    if (String(e.message).includes("Not implemented: navigation")) return;
    erreurs.push(String(e.message) + " " + String((e.detail && e.detail.stack) || ""));
  });

  const dom = new JSDOM(html, {
    url: "https://fayna.test/demo.html",
    runScripts: "dangerously",
    virtualConsole: vc,
    beforeParse(window) {
      // Etat persiste que l'on veut retrouver au chargement (simulation d'un rechargement de page).
      if (options.stockage) {
        for (const [k, v] of Object.entries(options.stockage)) window.localStorage.setItem(k, v);
      }
      window.Element.prototype.scrollIntoView = function () {};
      window.print = function () {};
      window.confirm = function () { return options.confirme !== false; };
      Object.defineProperty(window.navigator, "clipboard", {
        configurable: true,
        value: { writeText: function () { return Promise.resolve(); } }
      });
      window.Blob = function FauxBlob(parties, opts) {
        this.parties = parties;
        this.type = opts && opts.type;
      };
      let n = 0;
      window.URL.createObjectURL = function (blob) {
        capturesCSV.push({
          contenu: (blob && blob.parties ? blob.parties : []).join(""),
          type: blob && blob.type
        });
        return "blob:fayna/" + ++n;
      };
      window.URL.revokeObjectURL = function () {};
      // Le pied de page affirme au visiteur, et a la loi senegalaise 2008-12, qu'AUCUNE donnee
      // ne part vers un serveur sans son action. jsdom ne fournit pas fetch : on le pose nous-meme
      // pour COMPTER. Toute requete sortante pendant un usage normal est une promesse trahie.
      // La promesse ne se resout JAMAIS : rien ne sort, et aucun rejet non gere ne fait tomber
      // le harnais avant que l'assertion ait pu constater l'appel.
      window.fetch = function (url) {
        appelsReseau.push(String(url));
        return new Promise(function () {});
      };
    }
  });

  const w = dom.window;
  const champsNommes = restaurerAccesNommeFormulaires(w);
  return {
    dom, window: w, document: w.document, erreurs, capturesCSV, appelsReseau, champsNommes,
    $: (id) => w.document.getElementById(id),
    cartes: () => [...w.document.querySelectorAll("#list .debtor")],
    carte(nom) {
      return this.cartes().find((c) => c.querySelector(".name").textContent === nom) || null;
    },
    bouton(racine, libelle) {
      return [...racine.querySelectorAll("button")].find((b) => b.textContent.trim() === libelle) || null;
    },
    clic(el) { el.dispatchEvent(new w.MouseEvent("click", { bubbles: true, cancelable: true })); },
    saisir(el, valeur) {
      el.value = valeur;
      el.dispatchEvent(new w.Event("input", { bubbles: true }));
    },
    changer(el, valeur) {
      el.value = valeur;
      el.dispatchEvent(new w.Event("change", { bubbles: true }));
    },
    touche(cible, key) {
      cible.dispatchEvent(new w.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    },
    stockage() {
      const out = {};
      for (let i = 0; i < w.localStorage.length; i++) {
        const k = w.localStorage.key(i);
        out[k] = w.localStorage.getItem(k);
      }
      return out;
    },
    soumettre() {
      w.document.getElementById("form")
        .dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
    },
    fermer() { dom.window.close(); }
  };
}

/**
 * jsdom n'implemente pas le « named getter » des formulaires (`form.nom` -> le champ nomme
 * « nom »), qui est standard et dont le gestionnaire de soumission se sert. Sans ce rattrapage,
 * le harnais testerait un navigateur qui n'existe pas. On le restitue a l'identique, en
 * s'appuyant sur `form.elements` : un champ mal nomme reste donc introuvable ICI comme dans un
 * vrai navigateur, le rattrapage ne masque aucun bug.
 */
function restaurerAccesNommeFormulaires(window) {
  const noms = [];
  window.document.querySelectorAll("form").forEach((f) => {
    for (const el of f.elements) {
      if (!el.name || el.name in f) continue;      // ne jamais ecraser action, method, reset...
      const n = el.name;
      Object.defineProperty(f, n, { configurable: true, get: () => f.elements.namedItem(n) });
      noms.push(n);
    }
  });
  return noms;
}

/** Date ISO relative au jour courant : les scenarios ne doivent pas vieillir tout seuls. */
function isoMoins(jours) {
  const d = new Date();
  d.setDate(d.getDate() - jours);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
const chiffres = (s) => String(s).replace(/\D/g, "");

/* =========================================================================================
   2. Comptage : un echec est ferme, jamais silencieux (LECON 8)
   ========================================================================================= */
let pass = 0;
let echecs = [];
let stopper = false;
function ok(cond, label) {
  if (cond) pass++;
  else {
    echecs.push(label);
    if (ROUGE) stopper = true;   // en auto-test, le premier rouge suffit
  }
}
/** Verifie une pre-condition du scenario lui-meme. Si elle casse, le scenario ne prouve rien. */
function requis(cond, label) {
  ok(cond, label);
  return cond;
}

/**
 * Bilan de fin de scenario. Il ne suffit pas de constater qu'une page se charge sans erreur :
 * une exception levee DANS un gestionnaire de clic est avalee par le navigateur, l'interface se
 * fige a moitie rendue et l'utilisateur n'apprend rien. On rejuge donc apres les interactions.
 */
function bilan(e, scenario) {
  ok(e.erreurs.length === 0,
    scenario + " : aucune erreur JS pendant les interactions (" + e.erreurs.slice(0, 1).join(" | ") + ")");
  ok(e.appelsReseau.length === 0,
    scenario + " : AUCUNE donnee ne part vers un serveur pendant un usage normal (vu " +
    e.appelsReseau.slice(0, 2).join(", ") + ")");
  e.fermer();
}

/* =========================================================================================
   3. Les scenarios. Chacun part d'un navigateur neuf.
   ========================================================================================= */

/* --- S1. Le visiteur arrive, la demo se remplit seule, il s'en sert ------------------------
   C'est le parcours promis par le critere 3 du rang 1 : « ouvrable en un clic, sans compte,
   avec des donnees fictives ». Il n'avait jamais ete execute. */
function s1_visite(html) {
  const e = charger(html);
  const { document } = e;

  ok(e.erreurs.length === 0, "la page s'execute sans erreur JS (" + e.erreurs.slice(0, 1).join(" | ") + ")");

  // 3 dossiers fictifs semes sans aucune action de l'utilisateur
  const cartes = e.cartes();
  if (!requis(cartes.length === 3, "amorcage : 3 impayes fictifs affiches sans rien saisir (vu " + cartes.length + ")")) {
    return e.fermer();
  }
  const noms = cartes.map((c) => c.querySelector(".name").textContent);
  ok(noms[0] === "Ets Fall & Frères", "tri par cout d'ignorance : le plus gros retard en tete (vu « " + noms[0] + " »)");
  ["Boutique Ndiaye", "Ets Fall & Frères", "Restaurant Teranga"].forEach((n) => {
    ok(noms.includes(n), "le debiteur fictif « " + n + " » est affiche");
  });

  // KPI calcules, pas ecrits en dur
  ok(chiffres(e.$("kpi-total").textContent) === "875000", "KPI total du = 875 000 (vu " + e.$("kpi-total").textContent + ")");
  ok(e.$("kpi-nb").textContent === "3", "KPI nombre a relancer = 3 (vu " + e.$("kpi-nb").textContent + ")");
  ok(chiffres(e.$("kpi-old").textContent) === "47", "KPI retard le plus ancien = 47 jours (vu " + e.$("kpi-old").textContent + ")");

  // Niveau d'escalade calcule a partir du retard reel
  const fall = e.carte("Ets Fall & Frères");
  const teranga = e.carte("Restaurant Teranga");
  const ndiaye = e.carte("Boutique Ndiaye");
  ok(fall.querySelector(".lvl").textContent === "Mise en demeure amiable", "47 jours de retard -> « Mise en demeure amiable »");
  ok(ndiaye.querySelector(".lvl").textContent === "Relance ferme", "22 jours de retard -> « Relance ferme »");
  ok(teranga.querySelector(".lvl").textContent === "Premier rappel", "4 jours de retard -> « Premier rappel »");

  // Le message existe VRAIMENT, il nomme le client, il n'est pas un gabarit vide
  const msgFall = fall.querySelector(".msg").textContent;
  ok(msgFall.length > 120, "le message de relance est redige (" + msgFall.length + " caracteres)");
  ok(msgFall.includes("Ets Fall & Frères"), "le message nomme le debiteur");
  ok(msgFall.replace(/[\s ]/g, "").includes("640000"), "le message porte le montant du");

  // Le lien WhatsApp transporte EXACTEMENT le texte affiche (LECON 19 : le libelle ne suffit pas)
  const wa = fall.querySelector("a.btn-wa");
  ok(wa && wa.href.startsWith("https://wa.me/221770001122?text="), "lien WhatsApp construit sur le numero du debiteur");
  ok(wa && decodeURIComponent(wa.href.split("?text=")[1]) === msgFall,
    "le lien WhatsApp transporte le texte REELLEMENT affiche, caractere pour caractere");

  // Historique et cadence, calcules a partir des relances deja notees
  ok(/2/.test(fall.querySelector(".hist").textContent), "l'historique compte les 2 relances deja envoyees");
  ok(ndiaye.querySelector(".hist") === null, "aucun historique affiche quand aucune relance n'a ete envoyee");
  ok(teranga.querySelector(".cadence") !== null, "la cadence conseillee est affichee");

  // Escalade : la mise en demeure n'est offerte qu'a partir du niveau 2
  ok(e.bouton(fall, "Mise en demeure") !== null, "bouton mise en demeure present au niveau 3");
  ok(e.bouton(teranga, "Mise en demeure") === null, "pas de mise en demeure au niveau 1 (escalade respectee)");

  // --- Bascule de langue : le message change et le choix est persiste
  const avant = ndiaye.querySelector(".msg").textContent;
  e.clic(ndiaye.querySelector('.tab[data-l="fr"]'));
  const apres = e.carte("Boutique Ndiaye").querySelector(".msg").textContent;
  ok(apres.length < avant.length && avant.includes(apres), "onglet Francais : le message perd sa partie wolof");
  ok(e.carte("Boutique Ndiaye").querySelector('.tab[data-l="fr"]').getAttribute("aria-selected") === "true",
    "l'onglet actif porte aria-selected=true");
  ok(JSON.parse(e.window.localStorage.getItem("fayna_v1"))[0].langue === "fr",
    "le choix de langue est enregistre dans le navigateur");

  // --- Mise en demeure : la fenetre s'ouvre, le courrier est rempli, Echap referme
  e.clic(e.bouton(e.carte("Ets Fall & Frères"), "Mise en demeure"));
  ok(e.$("mep-overlay").classList.contains("open"), "la fenetre de mise en demeure s'ouvre");
  const courrier = e.$("mep-doc").textContent;
  ok(courrier.includes("Mise en demeure de payer"), "le courrier porte son titre");
  ok(courrier.includes("Ets Fall & Frères"), "le courrier nomme le destinataire");
  ok(courrier.replace(/[\s ]/g, "").includes("640000"), "le courrier porte le montant reclame");
  ok(/six\s*cent/i.test(courrier.normalize("NFD").replace(/[̀-ͯ]/g, "")),
    "le courrier porte le montant en toutes lettres (exigence d'un acte formel)");
  e.touche(document, "Escape");
  ok(!e.$("mep-overlay").classList.contains("open"), "Echap referme la fenetre");

  // --- Echeancier negocie : le tableau est calcule, pas decoratif
  const det = e.carte("Ets Fall & Frères").querySelector("details.ech");
  if (requis(det !== null, "un echeancier est proposable des qu'il y a du retard")) {
    det.open = true;
    det.dispatchEvent(new e.window.Event("toggle"));
    const lignes = det.querySelectorAll(".ech-table tbody tr");
    ok(lignes.length === 3, "echeancier par defaut : 3 versements (vu " + lignes.length + ")");
    ok(chiffres(det.querySelector(".ech-table tfoot td.num").textContent) === "640000",
      "la somme des versements egale la dette (vu " + det.querySelector(".ech-table tfoot td.num").textContent + ")");
    ok(det.querySelector(".ech-out .msg").textContent.length > 80, "le message d'accompagnement de l'echeancier est redige");
    e.changer(det.querySelector("select"), "6");
    ok(det.querySelectorAll(".ech-table tbody tr").length === 6, "changer le nombre de versements recalcule le tableau");
  }

  // --- « Relance envoyee » : l'historique s'incremente pour de vrai
  e.clic(e.bouton(e.carte("Boutique Ndiaye"), "Relance envoyée"));
  const hist = e.carte("Boutique Ndiaye").querySelector(".hist");
  ok(hist !== null && /1/.test(hist.textContent), "noter une relance cree l'historique");
  ok(JSON.parse(e.window.localStorage.getItem("fayna_v1"))[0].relances.length === 1,
    "la relance notee est persistee");

  // --- Export CSV : on lit le FICHIER telecharge, pas le libelle des colonnes (LECON 19)
  e.clic(e.$("btn-export"));
  if (requis(e.capturesCSV.length === 1, "le clic sur Exporter produit un fichier")) {
    const brut = e.capturesCSV[0].contenu;
    ok(e.capturesCSV[0].type.includes("text/csv"), "le fichier est declare en text/csv");
    ok(brut.charCodeAt(0) === 0xfeff, "BOM present (Excel FR affiche les accents)");
    const lignes = brut.slice(1).split("\r\n");
    ok(lignes.length === 4, "le CSV contient l'entete + 3 dossiers (vu " + lignes.length + " lignes)");
    ok(lignes[0] === "nom;whatsapp;montant_fcfa;echeance;jours_retard;niveau;paye;nb_relances;derniere_relance",
      "entete exacte du CSV");
    const parLigne = {};
    lignes.slice(1).forEach((l) => { const c = l.split(";"); parLigne[c[0]] = c; });
    const cN = parLigne["Boutique Ndiaye"] || [];
    ok(cN.length === 9, "chaque ligne porte les 9 colonnes (vu " + cN.length + ")");
    ok(cN[1] === "771234567", "colonne whatsapp REMPLIE (vu « " + cN[1] + " »)");
    ok(cN[2] === "150000", "colonne montant REMPLIE (vu « " + cN[2] + " »)");
    ok(cN[3] === isoMoins(22), "colonne echeance REMPLIE avec la vraie date (vu « " + cN[3] + " »)");
    ok(cN[4] === "22", "colonne jours_retard CALCULEE (vu « " + cN[4] + " »)");
    ok(cN[5] === "Relance ferme", "colonne niveau REMPLIE (vu « " + cN[5] + " »)");
    ok(cN[6] === "non", "colonne paye REMPLIE (vu « " + cN[6] + " »)");
    ok(cN[7] === "1", "colonne nb_relances reflete la relance notee plus haut (vu « " + cN[7] + " »)");
    ok(cN[8] === isoMoins(0), "colonne derniere_relance REMPLIE (vu « " + cN[8] + " »)");
    const cF = parLigne["Ets Fall & Frères"] || [];
    ok(cF[7] === "2", "les relances preexistantes sont comptees (vu « " + cF[7] + " »)");
    ok(cF[8] === isoMoins(6), "la date de derniere relance est la bonne (vu « " + cF[8] + " »)");
  }

  bilan(e, "S1 visite");
}

/* --- S2. Saisie, plafond de la demo, echappement HTML, edition ---------------------------- */
function s2_saisie(html) {
  const e = charger(html);

  function ajouter(nom, montant, jours) {
    e.saisir(e.$("f-nom"), nom);
    e.saisir(e.$("f-montant"), String(montant));
    e.saisir(e.$("f-echeance"), isoMoins(jours));
    e.soumettre();
  }

  if (!requis(e.cartes().length === 3, "S2 part bien des 3 dossiers fictifs")) return e.fermer();

  // Le gestionnaire de soumission lit les champs par leur NOM. Si un nom disparait du HTML, le
  // formulaire casse dans un vrai navigateur : on l'affirme ici plutot que de le decouvrir en prod.
  ["nom", "tel", "montant", "echeance", "langue", "relation"].forEach((n) => {
    ok(e.champsNommes.includes(n), "le formulaire expose le champ nomme « " + n + " »");
  });

  // Champs obligatoires : un formulaire vide n'ajoute rien
  e.soumettre();
  ok(e.cartes().length === 3, "un formulaire vide n'ajoute aucun dossier");
  ok(e.$("toast").textContent === "Nom, montant et date sont requis", "l'utilisateur est prevenu du champ manquant");

  // Echappement : un nom hostile ne devient jamais du HTML
  ajouter('<img src=x onerror="window.__xss=1">', 50000, 10);
  ok(e.cartes().length === 4, "l'ajout par formulaire fonctionne");
  ok(e.document.querySelectorAll("#list img").length === 0, "un nom contenant du HTML n'injecte aucune balise");
  ok(e.window.__xss === undefined, "aucun script injecte n'a ete execute");
  ok(e.cartes().some((c) => c.querySelector(".name").textContent === '<img src=x onerror="window.__xss=1">'),
    "le nom hostile est affiche comme du texte");

  // Plafond de la demo : le 6e dossier est refuse, l'utilisateur sait pourquoi
  ajouter("Cinquieme client", 12000, 3);
  ok(e.cartes().length === 5, "5e dossier accepte (plafond de la demo)");
  ajouter("Sixieme client", 12000, 3);
  ok(e.cartes().length === 5, "6e dossier REFUSE : le plafond de la demo est applique");
  ok(e.$("toast").textContent === "Démo limitée à 5 dossiers. Effacez-en un pour continuer.",
    "le refus est explique a l'utilisateur (vu « " + e.$("toast").textContent + " »)");
  ok(JSON.parse(e.window.localStorage.getItem("fayna_v1")).length === 5, "rien de refuse n'est enregistre en douce");

  // Edition d'un dossier existant
  e.clic(e.bouton(e.carte("Restaurant Teranga"), "Modifier"));
  ok(e.$("f-nom").value === "Restaurant Teranga", "« Modifier » recharge la fiche dans le formulaire");
  ok(e.$("f-montant").value === "85000", "le montant existant est recharge");
  ok(e.$("btn-cancel-edit").hidden === false, "un bouton d'annulation apparait en mode modification");
  ok(e.$("h-add").textContent.includes("Modifier ce client"), "le titre du formulaire bascule en mode modification");
  e.saisir(e.$("f-montant"), "99000");
  e.soumettre();
  ok(e.cartes().length === 5, "modifier ne cree pas de doublon");
  ok(chiffres(e.carte("Restaurant Teranga").querySelector(".amt").textContent) === "99000",
    "le montant modifie est affiche (vu " + e.carte("Restaurant Teranga").querySelector(".amt").textContent + ")");
  // Affiche ne veut pas dire enregistre : l'objet est modifie en memoire meme sans sauvegarde.
  // Sans ce controle, une modification perdue au rechargement passerait inapercue.
  ok(JSON.parse(e.window.localStorage.getItem("fayna_v1")).some((d) => d.nom === "Restaurant Teranga" && d.montant === 99000),
    "la modification est ENREGISTREE dans le navigateur, pas seulement affichee");
  ok(e.$("h-add").textContent.includes("Ajouter un client"), "le formulaire revient en mode ajout apres enregistrement");

  bilan(e, "S2 saisie");
}

/* --- S3. Tout effacer, puis rechargement : la demo ne doit PAS se re-semer -----------------
   Sans le marqueur d'amorcage, « Tout effacer » serait annule au rechargement suivant :
   l'utilisateur effacerait sans jamais rien effacer. */
function s3_effacer(html) {
  const e = charger(html);
  if (!requis(e.cartes().length === 3, "S3 part bien des 3 dossiers fictifs")) return e.fermer();

  e.clic(e.$("btn-clear"));
  ok(e.cartes().length === 0, "« Tout effacer » vide la liste");
  ok(e.document.querySelector("#list .empty") !== null, "l'etat vide est explique a l'utilisateur");
  ok(e.window.localStorage.getItem("fayna_v1") === "[]", "le navigateur ne garde plus aucune donnee client");
  const stockage = e.stockage();
  bilan(e, "S3 effacement");

  // Rechargement de la page avec le navigateur dans l'etat ou l'utilisateur l'a laisse
  const e2 = charger(html, { stockage });
  ok(e2.window.localStorage.getItem("fayna_demo_seed_v1") === "true",
    "le marqueur d'amorcage a bien traverse le rechargement (sinon le scenario ne prouve rien)");
  ok(e2.cartes().length === 0, "au rechargement, la demo NE se re-seme PAS : l'effacement tient");

  // LECON 20 du cerveau : le pire defaut commercial d'une demo n'est pas un bug, c'est un
  // cul-de-sac. Un visiteur qui a tout efface doit pouvoir revenir a l'exemple en un clic,
  // sinon la seule page publique de la maison devient une page vide et le prospect part.
  e2.clic(e2.$("btn-demo"));
  ok(e2.cartes().length === 3, "apres un effacement, « charger l'exemple » remet la demo debout");
  ok(e2.carte("Ets Fall & Frères") !== null, "l'exemple recharge est bien le jeu de donnees fictives");
  bilan(e2, "S3 rechargement");

  // Refus d'effacer : la liste survit
  const e3 = charger(html, { confirme: false });
  e3.clic(e3.$("btn-clear"));
  ok(e3.cartes().length === 3, "annuler la confirmation n'efface rien");
  bilan(e3, "S3 refus d'effacer");
}

/* --- S4. Cle IA : jamais persistee sans consentement explicite ----------------------------- */
function s4_cle_ia(html) {
  const e = charger(html);
  const carte = () => e.carte("Ets Fall & Frères");
  if (!requis(carte() !== null, "S4 part bien des dossiers fictifs")) return e.fermer();

  ok(e.bouton(carte(), "Personnaliser (IA)") === null, "sans cle, aucun bouton IA n'est propose");
  e.saisir(e.$("ai-key"), "gsk_cle_de_test_jamais_appelee");
  ok(e.bouton(carte(), "Personnaliser (IA)") !== null, "des qu'une cle est saisie, le bouton IA apparait");
  ok(JSON.parse(e.window.localStorage.getItem("fayna_ai_v1")).key === "",
    "la cle N'EST PAS enregistree tant que « se souvenir » n'est pas coche");

  const c = e.$("ai-remember");
  c.checked = true;
  c.dispatchEvent(new e.window.Event("change", { bubbles: true }));
  ok(JSON.parse(e.window.localStorage.getItem("fayna_ai_v1")).key === "gsk_cle_de_test_jamais_appelee",
    "cochee, la case enregistre la cle");
  c.checked = false;
  c.dispatchEvent(new e.window.Event("change", { bubbles: true }));
  ok(JSON.parse(e.window.localStorage.getItem("fayna_ai_v1")).key === "",
    "decochee, la case EFFACE la cle deja stockee (elle ne la laisse pas trainer)");

  // Le bouton « Revenir au message d'origine » existe toujours mais reste cache tant qu'aucune
  // reecriture n'a ete acceptee : sinon on proposerait d'annuler ce qui n'a pas eu lieu.
  const revert = e.bouton(carte(), "Revenir au message d'origine");
  ok(revert !== null && revert.hidden === true, "le retour au message d'origine reste cache sans reecriture IA");
  bilan(e, "S4 cle IA");
}

const SCENARIOS = [s1_visite, s2_saisie, s3_effacer, s4_cle_ia];

function jouer(html) {
  pass = 0; echecs = []; stopper = false;
  for (const s of SCENARIOS) {
    try { s(html); } catch (err) { ok(false, s.name + " a leve une exception : " + err.message); }
    if (stopper) break;
  }
  return { pass, echecs: echecs.slice() };
}

/* =========================================================================================
   4. Auto-test : le harnais DOIT virer au rouge quand on casse le cablage (LECONS 18 et 21)
   ========================================================================================= */
const MUTATIONS = [
  ["la liste n'est plus remplie",
    "      list.appendChild(wrap);", "      /* mutation */"],
  ["l'export CSV ne parcourt plus les dossiers",
    "var csv = E.serialiserCSV(E.lignesCSV(state, todayISO()));", "var csv = E.serialiserCSV(E.lignesCSV([], todayISO()));"],
  ["le marqueur d'amorcage n'est plus pose (« Tout effacer » serait annule au rechargement)",
    "if (amorcage.poserMarqueur) save(LS_SEED, true);", "if (false) save(LS_SEED, true);"],
  ["le plafond de la demo n'est plus applique",
    "if (!D.peutAjouter(state.length)) {", "if (false) {"],
  ["le nom du debiteur n'est plus echappe (XSS)",
    "'<div class=\"dh\"><span class=\"name\">' + esc(d.nom)", "'<div class=\"dh\"><span class=\"name\">' + (d.nom)"],
  ["le lien WhatsApp ne suit plus le texte affiche",
    "if (waBtn) waBtn.href = E.lienWhatsapp(d.tel, t);", "if (waBtn) waBtn.href = E.lienWhatsapp(d.tel, \"texte perime\");"],
  ["la fenetre de mise en demeure ne s'ouvre plus",
    "$(\"mep-overlay\").classList.add(\"open\");", "/* mutation */"],
  ["Echap ne referme plus la mise en demeure",
    "if (e.key === \"Escape\") { fermerMep(); return; }", "if (e.key === \"EscapeXX\") { fermerMep(); return; }"],
  ["le choix de langue n'est plus persiste",
    "cur.l = langs[idx][0]; d.langue = cur.l; save(LS, state); paint();", "cur.l = langs[idx][0]; paint();"],
  ["l'echeancier ne genere plus toutes les echeances",
    "var rows = plan.echeances.map(function (e) {", "var rows = plan.echeances.slice(0, 1).map(function (e) {"],
  ["le formulaire n'exige plus les champs obligatoires",
    "if (!nom || !montant || !echeance) { toast(\"Nom, montant et date sont requis\"); return; }", "/* mutation */"],
  ["la cle IA est persistee malgre le refus de l'utilisateur",
    "save(LS_AI, { prov: ai.prov, key: ai.remember ? ai.key : \"\", remember: ai.remember });", "save(LS_AI, { prov: ai.prov, key: ai.key, remember: ai.remember });"],
  ["« charger l'exemple » ne remet plus rien (demo en cul-de-sac apres effacement)",
    "D.dossiersFictifs(todayISO()).slice(0, libres).forEach", "D.dossiersFictifs(todayISO()).slice(0, 0).forEach"],
  ["un mouchard reseau est ajoute au chargement de la page",
    "var amorcage = D.decisionAmorcage(", "fetch(\"https://mouchard.example/collecte\");var amorcage = D.decisionAmorcage("],
  ["les modifications d'un dossier ne sont plus enregistrees",
    "editingRef.echeance = echeance; editingRef.langue = f.langue.value; editingRef.relation = f.relation.value;\n      save(LS, state);", "editingRef.echeance = echeance; editingRef.langue = f.langue.value; editingRef.relation = f.relation.value;"]
];

function autotest(html) {
  let vertsAttendus = 0;
  const problemes = [];
  // LECON 21 : demo.html est en CRLF sous Windows. Un motif multi-ligne ecrit en \n ne matcherait
  // rien et la mutation passerait pour « detectee » alors qu'elle n'aurait jamais ete appliquee.
  const eol = html.includes("\r\n") ? "\r\n" : "\n";
  for (const [nom, motif, remplacement] of MUTATIONS) {
    const avant = motif.split("\n").join(eol);
    const apres = remplacement.split("\n").join(eol);
    const occurrences = html.split(avant).length - 1;
    if (occurrences !== 1) {
      problemes.push("MUTATION MORTE « " + nom + " » : motif introuvable ou ambigu (" + occurrences + " occurrences)");
      continue;
    }
    const mute = html.replace(avant, apres);
    if (mute === html) {                       // LECON 21 : une mutation inerte est un ECHEC
      problemes.push("MUTATION INERTE « " + nom + " » : le fichier n'a pas change");
      continue;
    }
    const r = jouer(mute);
    if (r.echecs.length === 0) problemes.push("NON DETECTEE : " + nom);
    else { vertsAttendus++; console.log("  rouge attendu, rouge obtenu — " + nom + "\n      -> " + r.echecs[0]); }
  }
  return { vertsAttendus, problemes };
}

/* ========================================================================================= */
(function main() {
  if (!fs.existsSync(FICHIER)) { console.error("demo.html introuvable"); process.exit(1); }
  const html = fs.readFileSync(FICHIER, "utf8");

  if (ROUGE) {
    console.log("=== AUTO-TEST du harnais DOM : " + MUTATIONS.length + " mutations du cablage ===");
    const { vertsAttendus, problemes } = autotest(html);
    console.log("\n" + vertsAttendus + "/" + MUTATIONS.length + " mutations detectees.");
    if (problemes.length) {
      console.error("\nECHEC de l'auto-test :");
      problemes.forEach((p) => console.error("  - " + p));
      process.exit(1);
    }
    console.log("Le harnais DOM sait virer au rouge sur chaque point qu'il pretend garder.");
    return;
  }

  console.log("=== HARNAIS DOM : la demo publique est executee et pilotee ===");
  const r = jouer(html);
  console.log(r.pass + " assertions vertes sur " + (r.pass + r.echecs.length) + ".");
  if (r.echecs.length) {
    console.error("\nECHECS :");
    r.echecs.forEach((x) => console.error("  - " + x));
    process.exit(1);
  }
  console.log("Le cablage de demo.html est execute, clique et verifie de bout en bout.");
})();
