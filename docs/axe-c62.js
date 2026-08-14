// Preuve de rendu c62 : audit axe-core REEL (F-axe-core).
// Injecte axe-core (MIT, uniquement cote test ; l'app reste zero-dependance) et lance un audit
// WCAG 2.0/2.1 niveau A + AA sur les etats reels de l'application : accueil, demo chargee,
// echeancier ouvert, mise en demeure ouverte. Echoue si une violation d'impact serious/critical existe.
// Usage : node docs/axe-c62.js
"use strict";
const path = require("path");
const puppeteer = require("puppeteer");
const axeSource = require("axe-core").source;

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function audit(page, ctx) {
  await page.evaluate(axeSource);
  return await page.evaluate(async (tags) => {
    const res = await window.axe.run(document, {
      runOnly: { type: "tag", values: tags },
      resultTypes: ["violations"]
    });
    return res.violations.map(v => ({
      id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length,
      sample: (v.nodes[0] && v.nodes[0].target && v.nodes[0].target.join(" ")) || ""
    }));
  }, TAGS);
}

(async () => {
  const url = "file://" + path.resolve(__dirname, "..", "index.html").replace(/\\/g, "/");
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle0" });

  const report = {};

  report.accueil = await audit(page);

  await page.click("#btn-demo");
  await new Promise(r => setTimeout(r, 150));
  report.demo = await audit(page);

  const summaries = await page.$$(".ech > summary");
  await summaries[0].click();
  await new Promise(r => setTimeout(r, 200));
  report.echeancier = await audit(page);

  const mepBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll(".debtor .acts button, .debtor .acts a"));
    return btns.find(b => /Mise en demeure/.test(b.textContent)) || null;
  });
  if (await page.evaluate(b => !!b, mepBtn)) {
    await mepBtn.asElement().click();
    await new Promise(r => setTimeout(r, 200));
    report.miseEnDemeure = await audit(page);
  }

  await browser.close();

  // Impacts bloquants : serious + critical (WCAG A/AA).
  const bloquant = v => v.impact === "serious" || v.impact === "critical";
  const flat = [];
  for (const k of Object.keys(report)) {
    for (const v of report[k]) flat.push({ etat: k, ...v });
  }
  const serieuses = flat.filter(bloquant);

  console.log(JSON.stringify({
    axeVersion: require("axe-core").version,
    tags: TAGS,
    parEtat: Object.fromEntries(Object.keys(report).map(k => [k, report[k].length])),
    violationsSerieuses: serieuses,
    toutesViolations: flat
  }, null, 2));

  const ok = serieuses.length === 0;
  console.log(ok
    ? "\nAXE c62 : OK - 0 violation serious/critical (WCAG 2 A/AA) sur 4 etats"
    : "\nAXE c62 : ECHEC - " + serieuses.length + " violation(s) serious/critical");
  process.exit(ok ? 0 : 1);
})();
