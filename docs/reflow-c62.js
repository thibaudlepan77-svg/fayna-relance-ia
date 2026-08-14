// Preuve de rendu c62 : F-zoom200 / WCAG 1.4.10 Reflow.
// Verifie qu'a 320 px CSS de large (equivalent zoom 400% sur 1280px, exigence WCAG 1.4.10)
// AUCUN etat de l'application ne provoque de defilement horizontal (pas d'overflow-x du document).
// On exerce tous les etats : app vide, demo chargee, echeancier ouvert (jusqu'a 12 versements),
// mise en demeure ouverte. On identifie tout element fautif qui deborderait la fenetre.
// Usage : node docs/reflow-c62.js
"use strict";
const path = require("path");
const puppeteer = require("puppeteer");

const WIDTH = 320; // WCAG 1.4.10 : contenu utilisable sans defilement horizontal a 320 px CSS.

// Renvoie l'overflow horizontal du document (px) + la liste des elements qui debordent la fenetre.
function probe() {
  const doc = document.documentElement;
  const overflow = doc.scrollWidth - doc.clientWidth;
  const vw = doc.clientWidth;
  const bad = [];
  const all = document.body.querySelectorAll("*");
  for (const el of all) {
    const st = getComputedStyle(el);
    if (st.display === "none" || st.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    // Element dont le bord droit depasse nettement la fenetre (tolerance 1px d'arrondi).
    if (r.right > vw + 1) {
      // WCAG 1.4.10 autorise un tableau de donnees a defiler dans SON PROPRE conteneur.
      // Si un ancetre a overflow-x auto/scroll/hidden ET tient lui-meme dans la fenetre,
      // le debordement est absorbe (le document ne defile pas) -> pas un defaut.
      let contained = false;
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const ps = getComputedStyle(p);
        if (/(auto|scroll|hidden)/.test(ps.overflowX)) {
          if (p.getBoundingClientRect().right <= vw + 1) { contained = true; break; }
        }
      }
      if (contained) continue;
      bad.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) || "",
        right: Math.round(r.right),
        width: Math.round(r.width)
      });
    }
  }
  return { overflow, vw, bad: bad.slice(0, 12) };
}

(async () => {
  const url = "file://" + path.resolve(__dirname, "..", "index.html").replace(/\\/g, "/");
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  const errors = [];
  const benin = t => /frame-ancestors' is ignored when delivered via a <meta>/.test(t);
  page.on("pageerror", e => { if (!benin(String(e))) errors.push(String(e)); });
  page.on("console", m => { if (m.type() === "error" && !benin(m.text())) errors.push("console:" + m.text()); });

  await page.setViewport({ width: WIDTH, height: 800, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle0" });

  const states = {};

  // Etat 1 : application vide (formulaire seul)
  states.vide = await page.evaluate(probe);

  // Etat 2 : demo chargee (2 debiteurs, KPIs, cartes)
  await page.click("#btn-demo");
  await new Promise(r => setTimeout(r, 150));
  states.demo = await page.evaluate(probe);

  // Etat 3 : echeancier ouvert, pousse a 12 versements (tableau le plus haut/large)
  const summaries = await page.$$(".ech > summary");
  await summaries[0].click();
  await new Promise(r => setTimeout(r, 150));
  const firstEch = await page.$(".ech");
  const selN = await firstEch.$("select");
  await selN.select("12");
  await new Promise(r => setTimeout(r, 150));
  states.echeancier12 = await page.evaluate(probe);

  // Etat 4 : mise en demeure ouverte (document formel)
  const mepBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll(".debtor .acts button, .debtor .acts a"));
    return btns.find(b => /Mise en demeure/.test(b.textContent)) || null;
  });
  const hasMep = await page.evaluate(b => !!b, mepBtn);
  if (hasMep) {
    await mepBtn.asElement().click();
    await new Promise(r => setTimeout(r, 150));
    states.miseEnDemeure = await page.evaluate(probe);
  }

  states.errors = errors;
  await browser.close();

  console.log(JSON.stringify(states, null, 2));

  const stateList = ["vide", "demo", "echeancier12", "miseEnDemeure"];
  let ok = errors.length === 0;
  for (const s of stateList) {
    if (!states[s]) continue;
    if (states[s].overflow > 1 || states[s].bad.length > 0) ok = false;
  }
  console.log(ok ? "\nREFLOW c62 (WCAG 1.4.10, 320px) : OK - aucun defilement horizontal"
                 : "\nREFLOW c62 : ECHEC - defilement horizontal ou element debordant detecte");
  process.exit(ok ? 0 : 1);
})();
