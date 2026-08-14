// Preuve de rendu c61 : exerce F-rappels (echeancier de paiement negocie + cadence de relance conseillee).
// Verifie au RENDU reel que la somme des versements affiches = la dette exacte, et que le message est genere.
// Usage : node docs/rendu-c61.js
"use strict";
const path = require("path");
const puppeteer = require("puppeteer");

const toNum = s => Number(String(s).replace(/[^\d]/g, "")); // enleve fines/insecables/FCFA

(async () => {
  const url = "file://" + path.resolve(__dirname, "..", "index.html").replace(/\\/g, "/");
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  const errors = [];
  const benin = t => /frame-ancestors' is ignored when delivered via a <meta>/.test(t);
  page.on("pageerror", e => { if (!benin(String(e))) errors.push(String(e)); });
  page.on("console", m => { if (m.type() === "error" && !benin(m.text())) errors.push("console:" + m.text()); });
  await page.setViewport({ width: 390, height: 900 });
  await page.goto(url, { waitUntil: "networkidle0" });

  const R = {};

  // Charger l'exemple (Ets Fall 640000 / niv 3, Boutique Ndiaye 150000 / niv 2)
  await page.click("#btn-demo");
  await new Promise(r => setTimeout(r, 150));

  // 1. Cadence : une ligne de cadence conseillee doit apparaitre sur les impayes actifs
  R.cadences = await page.$$eval(".cadence", els => els.map(e => e.textContent.trim()));

  // 2. Ouvrir l'echeancier de la 1re carte (Ets Fall, 640000). Le clic sur le summary genere la proposition.
  const summaries = await page.$$(".ech > summary");
  R.nbEcheanciers = summaries.length;
  await summaries[0].click();
  await new Promise(r => setTimeout(r, 200));

  // 3. Lire le tableau : montants des versements + total affiche
  const firstEch = await page.$(".ech");
  R.versements = await firstEch.$$eval(".ech-table tbody td.num", tds => tds.map(td => td.textContent.trim()));
  R.totalAffiche = await firstEch.$eval(".ech-table tfoot td.num", td => td.textContent.trim());
  R.caption = await firstEch.$eval(".ech-table caption", c => c.textContent.trim());
  R.message = await firstEch.$eval(".ech-out .msg", m => m.textContent.trim());

  // 4. Changer le nombre de versements a 4 et verifier la re-generation
  const selN = await firstEch.$("select");
  await selN.select("4");
  await new Promise(r => setTimeout(r, 150));
  R.versements4 = await firstEch.$$eval(".ech-table tbody td.num", tds => tds.map(td => td.textContent.trim()));

  // 5. Overflow horizontal (mobile 390px) avec l'echeancier ouvert
  R.overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  R.errors = errors;

  await browser.close();

  // Verifications
  const sommeVers = R.versements.reduce((s, v) => s + toNum(v), 0);
  const total = toNum(R.totalAffiche);
  const somme4 = R.versements4.reduce((s, v) => s + toNum(v), 0);

  const out = {
    cadences: R.cadences,
    nbEcheanciers: R.nbEcheanciers,
    versements: R.versements,
    sommeVersements: sommeVers,
    totalAffiche: total,
    caption: R.caption,
    versements4Somme: somme4,
    nb4: R.versements4.length,
    messageDebut: R.message.slice(0, 90),
    overflow: R.overflow,
    errors
  };
  console.log(JSON.stringify(out, null, 2));

  const good =
    R.cadences.length >= 2 &&
    R.nbEcheanciers >= 1 &&
    R.versements.length === 3 &&
    sommeVers === 640000 && total === 640000 &&   // somme des versements = dette exacte
    somme4 === 640000 && R.versements4.length === 4 &&
    /échéancier/.test(R.message) && /640/.test(R.message) &&
    R.overflow <= 0 &&
    errors.length === 0;
  console.log(good ? "\nRENDU c61 : OK" : "\nRENDU c61 : ECHEC");
  process.exit(good ? 0 : 1);
})();
