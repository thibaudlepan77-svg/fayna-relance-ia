// Preuve de rendu c60 : exerce F-edition (edition + relance envoyee + historique) et l'A11y.
// Usage : node docs/rendu-c60.js
"use strict";
const path = require("path");
const puppeteer = require("puppeteer");

(async () => {
  const url = "file://" + path.resolve(__dirname, "..", "index.html").replace(/\\/g, "/");
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  const errors = [];
  // La CSP frame-ancestors via <meta> est ignoree par le navigateur (limite connue, frontiere F-header-frame) : benin.
  const benin = t => /frame-ancestors' is ignored when delivered via a <meta>/.test(t);
  page.on("pageerror", e => { if (!benin(String(e))) errors.push(String(e)); });
  page.on("console", m => { if (m.type() === "error" && !benin(m.text())) errors.push("console:" + m.text()); });
  await page.setViewport({ width: 390, height: 850 });
  await page.goto(url, { waitUntil: "networkidle0" });

  const R = {};

  // 1. Charger l'exemple -> l'historique preexistant doit s'afficher (Ets Fall : 2 relances)
  await page.click("#btn-demo");
  await new Promise(r => setTimeout(r, 150));
  R.histInitiale = await page.$$eval(".hist", els => els.map(e => e.textContent.trim()));

  // 2. Cliquer "Relance envoyée" sur la 2e carte (Boutique Ndiaye, sans historique) -> nouveau bloc historique
  R.nbHistAvant = R.histInitiale.length;
  const sentBtns = await page.$$("xpath///button[normalize-space()='Relance envoyée']");
  await sentBtns[1].click();
  await new Promise(r => setTimeout(r, 150));
  R.histApres = await page.$$eval(".hist", els => els.map(e => e.textContent.trim()));

  // 3. Editer : cliquer "Modifier" sur la 1re carte, changer le montant, enregistrer
  const editBtns = await page.$$("xpath///button[normalize-space()='Modifier']");
  await editBtns[0].click();
  await new Promise(r => setTimeout(r, 120));
  R.submitLabelEnEdition = await page.$eval("#btn-submit", b => b.textContent);
  R.cancelVisible = await page.$eval("#btn-cancel-edit", b => !b.hidden);
  R.headingEnEdition = await page.$eval("#h-add", h => h.textContent.trim());
  R.montantPrefill = await page.$eval("#f-montant", i => i.value);   // 1re carte = Ets Fall, 640000
  await page.$eval("#f-montant", i => { i.value = ""; });
  await page.type("#f-montant", "175000");
  await page.click("#btn-submit");
  await new Promise(r => setTimeout(r, 200));
  R.submitLabelApres = await page.$eval("#btn-submit", b => b.textContent);
  R.cancelHiddenApres = await page.$eval("#btn-cancel-edit", b => b.hidden);
  // le montant modifie doit apparaitre quelque part dans la liste
  R.montantMajVisible = await page.$eval("#list", el => /175(\s| | )?000/.test(el.textContent));

  // 4. Taille de cible : tous les .btn-sm VISIBLES >= 44px de haut (WCAG 2.5.5)
  R.btnSmMin = await page.$$eval(".btn-sm", els => {
    let min = 9999, n = 0;
    els.forEach(e => { if (e.offsetParent !== null) { n++; const h = e.getBoundingClientRect().height; if (h < min) min = h; } });
    return n ? Math.round(min) : 0;
  });

  // 5. Overflow horizontal (mobile 390px)
  R.overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

  R.errors = errors;
  console.log(JSON.stringify(R, null, 2));
  await browser.close();

  const good = R.histInitiale.length >= 1 && R.histApres.length === R.nbHistAvant + 1 &&
    R.submitLabelEnEdition === "Enregistrer les modifications" && R.cancelVisible === true &&
    R.montantPrefill === "640000" && R.montantMajVisible === true &&
    R.submitLabelApres === "Ajouter et générer la relance" && R.cancelHiddenApres === true &&
    R.btnSmMin >= 44 && R.overflow <= 0 && errors.length === 0;
  console.log(good ? "\nRENDU c60 : OK" : "\nRENDU c60 : ECHEC");
  process.exit(good ? 0 : 1);
})();
