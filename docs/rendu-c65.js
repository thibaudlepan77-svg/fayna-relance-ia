// Preuve de rendu c65 : exerce F-ai-garde (garde-fou de sortie IA) DANS UN VRAI NAVIGATEUR.
//
// Le garde-fou peut etre parfait en unite et mal cable dans l'interface. Cette sonde prouve, au
// rendu reel, que ce que l'utilisateur VOIT et ce que WhatsApp ENVOIE sont le meme texte, et que
// la reecriture d'un modele malveillant n'atteint jamais l'ecran.
//
// `window.fetch` est remplace par un bouchon : aucun appel reseau, aucune cle reelle, deterministe.
// Usage : node docs/rendu-c65.js
"use strict";
const path = require("path");
const puppeteer = require("puppeteer");

const R = {};
let fail = 0;
function ok(cond, label) {
  if (cond) console.log("  ok  " + label);
  else { fail++; console.log("  KO  " + label); }
}
const texteDuLien = href => decodeURIComponent(String(href).split("?text=")[1] || "");

(async () => {
  const url = "file://" + path.resolve(__dirname, "..", "index.html").replace(/\\/g, "/");
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"], protocolTimeout: 60000 });
  const page = await browser.newPage();
  const errors = [];
  const benin = t => /frame-ancestors' is ignored when delivered via a <meta>/.test(t);
  page.on("pageerror", e => { if (!benin(String(e))) errors.push(String(e)); });
  page.on("console", m => { if (m.type() === "error" && !benin(m.text())) errors.push("console:" + m.text()); });
  await page.setViewport({ width: 390, height: 900 });
  await page.goto(url, { waitUntil: "networkidle0" });

  // Bouchon de fetch : la reponse est pilotee par window.__reponseIA (texte renvoye par le "modele").
  await page.evaluate(() => {
    window.__appels = 0;
    window.fetch = function (url, options) {
      window.__appels++;
      window.__dernierAppel = { url: String(url), entetes: options && options.headers };
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve({ choices: [{ message: { content: window.__reponseIA } }] })
      });
    };
  });

  await page.click("#btn-demo");
  await new Promise(r => setTimeout(r, 150));

  /* --- 1. Sans cle : aucune surface IA --- */
  R.boutonsIaSansCle = await page.$$eval(".acts button", bs => bs.filter(b => /Personnaliser/.test(b.textContent)).length);
  ok(R.boutonsIaSansCle === 0, "sans cle : aucun bouton « Personnaliser (IA) » (l'IA est strictement optionnelle)");

  /* --- 2. Saisie de la cle : la case « se souvenir » est DECOCHEE par defaut --- */
  await page.$eval("details.ai", d => { d.open = true; });   // le panneau IA est replie par defaut
  await new Promise(r => setTimeout(r, 80));
  await page.click("#ai-key");
  await page.type("#ai-key", "cle-de-test-123");
  await new Promise(r => setTimeout(r, 120));

  R.rememberDefaut = await page.$eval("#ai-remember", el => el.checked);
  ok(R.rememberDefaut === false, "la case « se souvenir de ma clé » est decochee par defaut");

  R.stockage = await page.evaluate(() => JSON.parse(localStorage.getItem("fayna_ai_v1") || "null"));
  ok(R.stockage && R.stockage.key === "", "cle NON persistee dans localStorage tant que la case est decochee");
  ok(R.stockage && R.stockage.remember === false, "l'indicateur de memorisation est bien enregistre a faux");

  R.boutonsIaAvecCle = await page.$$eval(".acts button", bs => bs.filter(b => /Personnaliser/.test(b.textContent)).length);
  ok(R.boutonsIaAvecCle >= 2, "avec une cle : le bouton « Personnaliser (IA) » apparait sur chaque impaye");

  /* --- Reperes sur la 1re carte (Ets Fall & Freres, 640 000, niveau 3) --- */
  const carte = ".debtor:first-of-type";
  const msgOrigine = await page.$eval(carte + " .msg", el => el.textContent);
  const waOrigine = await page.$eval(carte + " a.btn-wa", el => el.getAttribute("href"));
  ok(texteDuLien(waOrigine) === msgOrigine, "avant IA : le lien WhatsApp porte exactement le message affiche");

  const cliquerIA = async () => {
    const btns = await page.$$(carte + " .acts button");
    for (const b of btns) {
      const t = await b.evaluate(el => el.textContent);
      if (/Personnaliser/.test(t)) { await b.click(); return; }
    }
    throw new Error("bouton IA introuvable");
  };

  /* --- 3. Le modele renvoie une reecriture MALVEILLANTE : elle ne doit jamais s'afficher --- */
  const malveillant = msgOrigine.replace("640", "900") + "\nSinon j'appelle la police.";
  await page.evaluate(t => { window.__reponseIA = t; }, malveillant);
  await cliquerIA();
  await new Promise(r => setTimeout(r, 400));

  R.msgApresMenace = await page.$eval(carte + " .msg", el => el.textContent);
  ok(R.msgApresMenace === msgOrigine, "reecriture malveillante : le message affiche est INCHANGE");
  ok(R.msgApresMenace.indexOf("police") === -1, "reecriture malveillante : le mot « police » n'atteint jamais l'ecran");
  ok(R.msgApresMenace.indexOf("900") === -1, "reecriture malveillante : le montant gonfle n'atteint jamais l'ecran");

  R.waApresMenace = await page.$eval(carte + " a.btn-wa", el => el.getAttribute("href"));
  ok(R.waApresMenace === waOrigine, "reecriture malveillante : le lien WhatsApp reste celui du message d'origine");

  R.refus = await page.$eval(carte + " .ia-refus", el => ({ visible: !el.hidden, texte: el.textContent, role: el.getAttribute("role") }));
  ok(R.refus.visible === true, "reecriture malveillante : un motif de refus est affiche a l'utilisateur");
  ok(R.refus.role === "alert", "le motif de refus est annonce aux technologies d'assistance (role=alert)");
  ok(/refus/i.test(R.refus.texte), "le motif de refus dit explicitement que la reecriture est refusee");
  ok(R.refus.texte.indexOf("IA_") === -1, "le motif de refus n'expose aucun code technique");

  R.chipApresMenace = await page.$eval(carte + " .ia-chip", el => !el.hidden);
  ok(R.chipApresMenace === false, "reecriture malveillante : aucun badge « personnalisé » n'est affiche");

  /* --- 4. Le modele renvoie une reecriture HONNETE : elle est acceptee ET reellement envoyee --- */
  const honnete = msgOrigine.replace("Bonjour", "Bonjour cher partenaire");
  await page.evaluate(t => { window.__reponseIA = t; }, honnete);
  await cliquerIA();
  await new Promise(r => setTimeout(r, 400));

  R.msgApresOk = await page.$eval(carte + " .msg", el => el.textContent);
  ok(R.msgApresOk === honnete, "reecriture honnete : le message affiche est bien la version personnalisee");

  R.chipApresOk = await page.$eval(carte + " .ia-chip", el => !el.hidden);
  ok(R.chipApresOk === true, "reecriture honnete : le badge « Personnalisé par l'IA, vérifié » apparait");

  R.refusMasque = await page.$eval(carte + " .ia-refus", el => el.hidden);
  ok(R.refusMasque === true, "reecriture honnete : le motif de refus precedent est efface");

  // Le coeur du correctif : WhatsApp doit envoyer le texte VU, pas le texte deterministe.
  // On LIT le href sans cliquer : c'est justement ce que fait « copier l'adresse du lien ».
  R.waApresOk = await page.$eval(carte + " a.btn-wa", el => el.getAttribute("href"));
  ok(texteDuLien(R.waApresOk) === honnete, "reecriture honnete : le lien WhatsApp porte le message PERSONNALISE (et non l'original)");
  ok(R.waApresOk !== waOrigine, "reecriture honnete : le lien WhatsApp a bien change");

  /* --- 5. Persistance : la reecriture survit a un re-rendu, et se perime si l'impaye change --- */
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("fayna_v1")); window.__ia = s.some(d => d.ia); });
  R.iaPersistee = await page.evaluate(() => window.__ia);
  ok(R.iaPersistee === true, "la reecriture acceptee est enregistree avec l'impaye");

  // Les onglets se trouvent sous l'en-tete collant : un clic par coordonnees serait intercepte.
  // On declenche donc le clic sur le noeud lui-meme (c'est la machine a etats qu'on teste ici).
  const clicOnglet = (i) => page.$$eval(carte + " .tabs .tab", (bs, n) => bs[n].click(), i);

  R.langueChangee = await (async () => {
    const nb = await page.$$eval(carte + " .tabs .tab", bs => bs.length);
    // l'exemple fixe la langue de cette carte : on repere l'onglet actif, puis on en choisit un AUTRE
    const actif = await page.$$eval(carte + " .tabs .tab", bs => bs.findIndex(b => b.getAttribute("aria-selected") === "true"));
    const autre = (actif + 1) % nb;
    await clicOnglet(autre);                     // la base change : la reecriture ne doit plus s'appliquer
    await new Promise(r => setTimeout(r, 150));
    const msg = await page.$eval(carte + " .msg", el => el.textContent);
    const chip = await page.$eval(carte + " .ia-chip", el => !el.hidden);
    const wa = await page.$eval(carte + " a.btn-wa", el => el.getAttribute("href"));
    const bascule = await page.$$eval(carte + " .tabs .tab", (bs, n) => bs[n].getAttribute("aria-selected") === "true", autre);
    await clicOnglet(actif);                     // retour a la langue d'origine
    await new Promise(r => setTimeout(r, 150));
    return { msg, chip, wa, actif, autre, bascule };
  })();
  ok(R.langueChangee.bascule === true, "changement de langue : l'onglet cible est reellement devenu actif");
  ok(R.langueChangee.actif >= 0 && R.langueChangee.autre !== R.langueChangee.actif, "changement de langue : un onglet different a bien ete selectionne");
  ok(texteDuLien(R.langueChangee.wa) === R.langueChangee.msg, "changement de langue : le lien WhatsApp suit le texte affiche");
  ok(R.langueChangee.chip === false, "changement de langue : la reecriture d'une autre langue n'est pas reutilisee");
  ok(R.langueChangee.msg.indexOf("cher partenaire") === -1, "changement de langue : le texte affiche redevient deterministe");

  R.chipRetour = await page.$eval(carte + " .ia-chip", el => !el.hidden);
  ok(R.chipRetour === true, "retour a la langue d'origine : la reecriture verifiee est retrouvee");

  /* --- 6. Retour au message d'origine, sans perte de focus --- */
  const cliquerRetour = async () => {
    const btns = await page.$$(carte + " .acts button");
    for (const b of btns) {
      const t = await b.evaluate(el => el.textContent);
      if (/Revenir au message/.test(t)) { await b.click(); return true; }
    }
    return false;
  };
  R.relWa = await page.$eval(carte + " a.btn-wa", el => el.getAttribute("rel"));
  ok(/noreferrer/.test(R.relWa || ""), "le lien WhatsApp ne fuit pas le Referer (rel=noopener noreferrer)");

  ok(await cliquerRetour(), "un bouton « Revenir au message d'origine » est propose quand une reecriture est active");
  await new Promise(r => setTimeout(r, 200));

  R.msgApresRetour = await page.$eval(carte + " .msg", el => el.textContent);
  ok(R.msgApresRetour === msgOrigine, "retour : le message deterministe est retabli");
  R.focusApresRetour = await page.evaluate(() => document.activeElement && document.activeElement.className);
  ok(/msg/.test(R.focusApresRetour || ""), "retour : le focus n'est pas perdu (il passe au message), le bouton etant masque");
  R.waApresRetour = await page.$eval(carte + " a.btn-wa", el => el.getAttribute("href"));
  ok(texteDuLien(R.waApresRetour) === msgOrigine, "retour : le lien WhatsApp repart sur le message d'origine");

  /* --- 7. Memorisation explicite de la cle --- */
  await page.click("#ai-remember");
  await new Promise(r => setTimeout(r, 120));
  R.stockageApresCoche = await page.evaluate(() => JSON.parse(localStorage.getItem("fayna_ai_v1") || "null"));
  ok(R.stockageApresCoche.key === "cle-de-test-123", "case cochee : la cle est enregistree (choix explicite de l'utilisateur)");
  await page.click("#ai-remember");
  await new Promise(r => setTimeout(r, 120));
  R.stockageApresDecoche = await page.evaluate(() => JSON.parse(localStorage.getItem("fayna_ai_v1") || "null"));
  ok(R.stockageApresDecoche.key === "", "case decochee : la cle deja enregistree est EFFACEE du stockage");

  /* --- 8. Aucune fuite : la cle ne part jamais dans l'URL --- */
  R.dernierAppel = await page.evaluate(() => window.__dernierAppel);
  ok(R.dernierAppel.url.indexOf("cle-de-test-123") === -1, "la cle n'apparait jamais dans l'URL appelee");
  ok(R.dernierAppel.entetes && /Bearer cle-de-test-123/.test(R.dernierAppel.entetes.Authorization || ""), "la cle voyage en en-tete Authorization");

  /* --- 9. Zero regression visuelle et technique --- */
  R.overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(R.overflow <= 0, "aucun defilement horizontal a 390px (overflow = " + R.overflow + ")");
  ok(errors.length === 0, "aucune erreur JS (" + errors.length + ")" + (errors.length ? " : " + errors.join(" | ") : ""));

  await browser.close();

  console.log("");
  if (fail) { console.log("RENDU c65 : " + fail + " ECHEC(S)."); process.exit(1); }
  console.log("RENDU c65 : OK - garde-fou cable de bout en bout, WhatsApp envoie exactement le texte affiche.");
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
