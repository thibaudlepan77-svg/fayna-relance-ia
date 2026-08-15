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
// La demo vit desormais a une adresse PROPRE. La racine est reservee a la future page de
// vente (critere n° 1 du rang 1, bloque par A1). Sans cette separation, le jour de sa
// publication, « Ouvrir la demonstration » aurait silencieusement servi la page de vente.
const URL_RACINE = "https://thibaudlepan77-svg.github.io/fayna-relance-ia/";
const URL_PUBLIQUE = URL_RACINE + "demo.html";

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
    // Un seul champ masque est legitime : la cle IA du visiteur (elle ne doit PAS s'afficher en
    // clair sur un ecran partage). Tout autre champ masque signale une authentification, donc un
    // compte, donc la violation du critere « ouvrable en un clic, sans compte ».
    const champsMasques = [...demo.matchAll(/<input[^>]*type=["']password["'][^>]*>/gi)].map((m) => m[0]);
    ok(champsMasques.length <= 1,
      "au plus un champ masque dans la demo (trouve " + champsMasques.length + ")");
    ok(champsMasques.every((c) => /id=["']ai-key["']/.test(c)),
      "le seul champ masque de la demo est la cle IA du visiteur, pas un mot de passe de compte");
    for (const mot of ["se connecter", "inscription", "creer un compte", "connexion requise"]) {
      ok(!n.includes(mot), "la demo n'exige pas de compte (absence de « " + mot + " »)");
    }
    ok(n.includes("localstorage"), "la demo persiste en local (localStorage), aucun serveur");
    // Le lien WhatsApp du DEBITEUR se construit depuis sa fiche, jamais en dur : un numero fige
    // enverrait tous les visiteurs de la demo relancer la meme personne reelle. Seul le contact
    // de l'editeur a le droit d'etre ecrit en dur, et c'est verifie au point 5 bis.
    ok(/"https:\/\/wa\.me\/" \+ /.test(demo),
      "le lien WhatsApp du debiteur est construit depuis sa fiche, pas code en dur");
    const waEnDur = [...new Set([...demo.matchAll(/wa\.me\/(\d+)/g)].map((m) => m[1]))];
    ok(waEnDur.every((n) => n === TEL_CANONIQUE),
      "aucun numero de debiteur code en dur derriere wa.me (trouves : " + waEnDur.join(", ") + ")");
  }

  /* ---------- 5 bis. La demo est publiee sur GitHub Pages : rien de TRANSACTIONNEL ----------
     Le ToS interdit un site « primarily directed at facilitating commercial transactions or
     providing commercial SaaS ». Il n'interdit pas a un outil libre de nommer son auteur : tout
     projet open source le fait. La regle posee ce matin bannissait TOUT contact, ce qui faisait
     de la seule page en ligne un cul-de-sac, 100 % des prospects convaincus perdus. Elle est
     donc recadree sur ce que le texte vise reellement, la transaction, et durcie sur ce qui
     compte pour la maison : si un contact est affiche, il doit etre le CANONIQUE. */
  if (demo !== null) {
    ok(!demo.includes("FCFA/mois"), "aucun tarif d'abonnement dans la demo (ToS GitHub Pages)");
    ok(!/class="price"/.test(demo), "aucune grille de prix dans la demo");
    const nD = sansAccent(demo);
    for (const mot of ["s'abonner", "acheter", "commander", "paiement en ligne", "ajouter au panier"]) {
      ok(!nD.includes(mot), "aucune mecanique d'achat dans la demo (absence de « " + mot + " »)");
    }
    // Un contact est autorise, et s'il existe il ne peut etre que le bon. Un numero invente sur
    // la seule page publique de la maison est la faute la plus chere du lot (deja payee le matin).
    const numeros = [...new Set([...demo.matchAll(/wa\.me\/(\d+)/g)].map((m) => m[1]))];
    const intrus = numeros.filter((n) => n !== TEL_CANONIQUE);
    ok(intrus.length === 0, "tout lien WhatsApp fixe de la demo pointe le numero canonique (intrus : " + intrus.join(", ") + ")");
    const mails = [...new Set([...demo.matchAll(/[a-zA-Z0-9._-]+@jaayleer\.com/g)].map((m) => m[0]))];
    ok(mails.every((m) => m === MAIL_CANONIQUE), "tout email affiche dans la demo est le canonique (trouves : " + mails.join(", ") + ")");
    // Et le chemin de retour existe : sans lui, la demo convainc pour personne.
    ok(mails.length > 0 || numeros.length > 0, "la demo offre un chemin de retour vers l'editeur");
  }

  /* ---------- 5 ter. La demo ne s'auto-certifie pas plus que la page de vente ---------- */
  // Meme regle que le point 4, appliquee a l'artefact qui GENERE un courrier destine a un tiers.
  // C'est le support le plus expose : la page de vente affirme, la demo met des mots dans la
  // bouche du client. Le radical « conform » y est donc banni aussi. (LECON 15)
  if (demo !== null) {
    const n = sansAccent(demo);
    ok(!n.includes("aucun risque juridique"), "demo : pas d'allegation « aucun risque juridique »");
    ok(!/conform[ea]ment a l'?acte uniforme/.test(n), "demo : le courrier ne se dit pas conforme a l'Acte uniforme");
    ok(!/article\s+\d+\s+de\s+l'?acte\s+uniforme/.test(n), "demo : aucune citation d'article OHADA");
    ok(!n.includes("mise en demeure ohada"), "demo : la mise en demeure n'est pas presentee comme certifiee OHADA");
    // Contrepartie POSITIVE : retirer le vernis juridique sans mettre l'avertissement a la place
    // laisserait le visiteur croire qu'il tient un acte. On exige donc la mise en garde.
    ok(n.includes("professionnel du droit"), "demo : le modele de lettre renvoie a un professionnel du droit");
    // Trouve par la revue juridique adverse du 2026-08-15 : l'outil fait saisir les donnees
    // personnelles d'un TIERS (le debiteur, qui n'a rien demande) et n'en disait pas un mot,
    // alors que la page de vente, elle, le disait. Le devoir d'information suit l'outil, pas
    // la brochure. Deux emplacements exiges : au moment d'activer l'IA, et dans les mentions.
    ok((n.match(/2008-12/g) || []).length >= 2,
      "demo : la loi senegalaise 2008-12 est rappelee au moins deux fois (option IA + mentions)");
    ok(n.includes("responsable de traitement"), "demo : l'utilisateur est nomme responsable de traitement");
  }

  /* ---------- 5 quater. Cadre de la demonstration VISIBLE PAR LE VISITEUR ---------- */
  // Le controle est borne au bandeau : un commentaire de code contenant « fictifs » satisfaisait
  // la version precedente de cette regle sans que le visiteur en voie la moindre trace.
  if (demo !== null) {
    const i = demo.indexOf('id="bandeau-demo"');
    ok(i !== -1, "bandeau de demonstration present dans la page");
    const bandeau = i === -1 ? "" : sansAccent(demo.slice(i, demo.indexOf("</div>", demo.indexOf("</div>", i) + 1)));
    ok(bandeau.includes("demonstration publique"), "le bandeau annonce une demonstration publique");
    ok(bandeau.includes("fictifs"), "le bandeau annonce des dossiers fictifs");
    ok(bandeau.includes("ne joignent personne"), "le bandeau previent que les numeros ne joignent personne");
  }

  /* ---------- 6. La demo publiee porte bien les fonctions que les documents annoncent ----------
     Le 2026-08-15, l'ecart a ete resorbe DANS LE BON SENS : au lieu de rabaisser les documents
     au niveau d'une reimplementation appauvrie, on a publie le moteur verifie. Ce controle
     verrouille le nouvel etat, sinon une regression ramenerait l'artefact faible en silence. */
  if (demo !== null) {
    const nDemo = sansAccent(demo);
    // On verifie la COMMANDE offerte au visiteur, pas la simple presence du mot : « csv »
    // se trouve aussi dans un nom de fichier et un type MIME, qui survivraient au retrait
    // complet de la fonction. (LECON 16 : tester la consequence, pas la trace.)
    ok(nDemo.includes("exporter en csv") && demo.includes('id="btn-export"'),
      "la demo offre l'export CSV (bouton + libelle)");
    ok(nDemo.includes("echeancier de paiement") || nDemo.includes("proposer un echeancier"),
      "la demo offre l'echeancier negocie");
    ok(nDemo.includes("mise en demeure") && demo.includes('id="mep-print"'),
      "la demo offre le modele de mise en demeure imprimable");
    ok(nDemo.includes("toutes lettres"), "la mise en demeure ecrit le montant en toutes lettres");
    ok(nDemo.includes("wolof"), "la demo est bien bilingue (wolof present)");
  }

  /* ---------- 6 bis. Aucune fonction promise a la demo qu'elle n'a pas ---------- */
  // c74 : « 20/22 fausses promesses passaient invisibles ». Le controle reste en place meme
  // maintenant que la demo est complete : c'est lui qui empechera la prochaine divergence.
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

  controlerDonneesFictives(demo, parcours);
}

/* ---------- 6 ter. Le parcours decrit les VRAIES donnees fictives ----------
   Le controle le plus utile du lot : le 2026-08-15, PARCOURS-ENTREE.md annoncait « Clinique
   Teranga, 90 000 FCFA, J-3 » et un total de 880 000 FCFA, alors que la demo servait un autre
   debiteur, un autre montant et un autre total. Personne ne l'aurait vu avant un prospect.
   On ne compare donc plus des textes entre eux : on compare le texte au CODE EXECUTE. */
function controlerDonneesFictives(demo, parcours) {
  if (demo === null || parcours === null) return;
  const d0 = demo.indexOf("/*DEMO_START*/");
  const d1 = demo.indexOf("/*DEMO_END*/");
  ok(d0 !== -1 && d1 > d0, "bloc DEMO_START present dans demo.html");
  if (d0 === -1 || d1 <= d0) return;

  let D = null;
  try { D = (0, eval)(demo.slice(d0, d1) + "\n;FAYNA_DEMO"); }
  catch (e) { ok(false, "couche demo evaluable (" + e.message + ")"); return; }
  ok(D && typeof D.dossiersFictifs === "function", "couche demo expose dossiersFictifs");
  if (!D) return;

  const dossiers = D.dossiersFictifs("2026-08-15");
  const nPar = sansAccent(parcours);
  const debut = nPar.indexOf("etape 2");
  const fin = nPar.indexOf("ecart connu");
  const zone = debut !== -1 && fin > debut ? parcours.slice(debut, fin) : parcours;

  // Chaque debiteur servi par le code doit etre decrit, avec SON montant.
  for (const d of dossiers) {
    ok(zone.includes(d.nom), "le parcours nomme le debiteur fictif « " + d.nom + " »");
    const montantEcrit = String(d.montant).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    ok(zone.replace(/[  ]/g, " ").includes(montantEcrit),
      "le parcours porte le montant reel de « " + d.nom + " » (" + montantEcrit + ")");
  }
  // Et AUCUN debiteur decrit ne doit etre absent du code (le piege « Clinique Teranga »).
  // Une ligne de debiteur = un nom EN GRAS suivi d'un montant en FCFA. Le critere porte sur la
  // forme reelle de la fiche, pas sur la numerotation : la liste des actions est numerotee elle
  // aussi, et la confondre avec des debiteurs ferait crier le harnais pour rien.
  const decrits = [...zone.matchAll(/^\s*\d+\.\s+\*\*(.+?)\*\*\s+—\s+[\d   ]+\s*FCFA/gm)].map((m) => m[1]);
  const fantomes = decrits.filter((nom) => !dossiers.some((d) => d.nom === nom));
  ok(fantomes.length === 0, "aucun debiteur decrit qui n'existe pas dans le code (fantomes : " + fantomes.join(", ") + ")");
  ok(decrits.length === dossiers.length,
    "le parcours decrit exactement " + dossiers.length + " debiteurs (trouve " + decrits.length + ")");

  // Le total annonce doit etre la somme reelle.
  const total = dossiers.reduce((s, d) => s + d.montant, 0);
  const totalEcrit = String(total).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  ok(zone.replace(/[  ]/g, " ").includes(totalEcrit),
    "le KPI annonce par le parcours est la somme reelle (" + totalEcrit + " FCFA)");
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

        // Ces controles-ci distinguent l'artefact NOUVEAU de l'ancien. Sans eux, le harnais
        // aurait dit « en ligne, verifie » alors que GitHub Pages servait encore la version
        // reduite de la veille : les controles generiques passaient sur les deux.
        ok(corps.includes("/*DEMO_START*/"), "la page en ligne embarque la couche demo bornee");
        ok(corps.includes("lignesCSV"), "la page en ligne porte l'export CSV du moteur");
        ok(corps.includes("genererEcheancier"), "la page en ligne porte l'echeancier negocie");
        ok(corps.includes("genererMiseEnDemeure"), "la page en ligne porte le modele de mise en demeure");
        ok(corps.includes("5 dossiers au maximum"), "la page en ligne annonce son plafond de demo");
        ok(corps.includes("2008-12"), "la page en ligne informe sur les donnees personnelles");
        ok(corps.includes("contact@jaayleer.com"), "la page en ligne offre un chemin vers l'editeur");
        // Taille : l'ancienne demo faisait 32 756 octets, le moteur complet en fait ~96 000.
        ok(corps.length > 80000, "la page en ligne est bien le moteur complet (" + corps.length + " octets, l'artefact faible en faisait 32 756)");
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

/* ---------- 7 bis. La racine historique mene-t-elle ENCORE a la demo ? ----------
 * Toute la communication deja partie (README, page offre du rang 2, messages) porte
 * l'adresse racine. La deplacer sans garantir le renvoi, c'est perdre les prospects
 * qui detiennent l'ancien lien. On ne l'espere pas, on le mesure.
 * https.get NE SUIT PAS les redirections : c'est bien le corps servi a la racine
 * qui est examine, pas celui de la destination.
 */
function verifierRacine() {
  return new Promise((resolve) => {
    https.get(URL_RACINE, (res) => {
      let corps = "";
      res.on("data", (c) => (corps += c));
      res.on("end", () => {
        ok(res.statusCode === 200, "racine repond 200 (recu " + res.statusCode + ")");
        ok(/http-equiv=["']refresh["'][^>]*url=demo\.html/i.test(corps),
           "la racine renvoie automatiquement vers demo.html");
        // Un renvoi automatique seul ne suffit pas : navigateurs durcis et lecteurs
        // d'ecran peuvent l'ignorer. Il faut un lien CLIQUABLE de secours.
        ok(/<a[^>]+href=["']demo\.html["']/i.test(corps),
           "la racine porte un lien de secours cliquable vers demo.html");
        // La racine est un tremplin, jamais un endroit ou l'on reste : elle ne doit
        // porter ni tarif ni argumentaire, l'axe reserve cela a la page de vente (A1).
        ok(!corps.includes("FCFA"), "aucun tarif sur la page de renvoi");
        resolve();
      });
    }).on("error", (e) => {
      ok(false, "racine injoignable : " + e.message);
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
  // Mutations portant sur PARCOURS-ENTREE.md.
  const mutationsParcours = [
    ["bornes de la section demo effacees", (p) => p.replace(/Écart connu/g, "Remarque")],
    // Le defaut REEL du 2026-08-15 : un debiteur decrit qui n'existe nulle part dans le code.
    ["debiteur fantome ajoute au parcours",
      (p) => p.replace("3. **Restaurant Teranga**", "3. **Clinique Teranga** — 90 000 FCFA — échéance J-3\n  4. **Restaurant Teranga**")],
    ["total des KPI fausse", (p) => p.replace("875 000 FCFA", "880 000 FCFA")],
  ];
  // Mutations portant sur demo.html. Ajoutees le 2026-08-15 avec le portage du moteur verifie :
  // le harnais surveillait la page de vente, la demo etait un angle mort. La premiere mutation
  // rejoue la regression exacte a eviter, le retour a l'artefact appauvri.
  const mutationsDemo = [
    ["retour a une demo sans echeancier", (d) => d.replace(/[eé]ch[eé]ancier/gi, "option")],
    ["retour a une demo sans export CSV", (d) => d.replace(/csv/gi, "tableau")],
    ["numero code en dur derriere wa.me", (d) => d.replace('"https://wa.me/" + n', '"https://wa.me/221771234567"')],
    ["tarif d'abonnement publie sur GitHub Pages", (d) => d.replace("</body>", "<p>15 000 FCFA/mois</p></body>")],
    ["email non canonique dans la demo", (d) => d.replace(MAIL_CANONIQUE, "fayna@jaayleer.com")],
    ["numero non canonique dans la demo", (d) => d.replace("wa.me/" + TEL_CANONIQUE, "wa.me/221770000000")],
    ["chemin de retour vers l'editeur supprime",
      (d) => d.replace(/<a href="mailto:[^"]*">[^<]*<\/a>/g, "nous").replace(/<a href="https:\/\/wa\.me\/\d+">[^<]*<\/a>/g, "WhatsApp")],
    ["bouton d'achat ajoute a la demo", (d) => d.replace("</body>", "<button>S'abonner</button></body>")],
    ["information sur les donnees personnelles retiree", (d) => d.replace(/2008-12/g, "en vigueur")],
    ["responsabilite du traitement effacee", (d) => d.replace(/responsable de traitement/g, "utilisateur")],
    ["champ de connexion ajoute a la demo", (d) => d.replace("</body>", '<input id="pwd" type="password"></body>')],
    ["cadre de demonstration efface du bandeau", (d) => d.replace("Démonstration publique.", "Bienvenue.")],
    ["dossiers fictifs presentes comme reels", (d) => d.replace(/fictifs/g, "réels")],
    ["avertissement juriste retire du modele de lettre", (d) => d.replace(/professionnel du droit/g, "spécialiste")],
    // Le code derive, les documents ne suivent pas : c'est la divergence par l'autre bout.
    ["un debiteur fictif renomme dans le code", (d) => d.replace('nom: "Restaurant Teranga"', 'nom: "Clinique Teranga"')],
    ["un montant fictif change dans le code", (d) => d.replace("montant: 85000", "montant: 90000")],
  ];

  const vente0 = lire("index.html");
  const demo0 = lire("demo.html");
  const obj0 = lire("OBJECTIONS.md");
  const par0 = lire("PARCOURS-ENTREE.md");
  let attrapees = 0;
  let inertes = 0;
  const total = mutations.length + mutationsParcours.length + mutationsDemo.length;

  function essayer(nom, v, d, o, p, avant, apres) {
    // Une mutation qui ne modifie RIEN mesurerait le vide et compterait comme un succes.
    // Elle est signalee et comptee en echec. (LECON 8 : echouer ferme, jamais en silence.)
    if (avant === apres) { inertes++; console.log("  [INERTE] " + nom + " -> cible absente du fichier"); return; }
    pass = 0; echecs.length = 0;
    controler(v, d, o, p);
    if (echecs.length > 0) { attrapees++; console.log("  [rouge OK] " + nom + " -> " + echecs.length + " echec(s)"); }
    else console.log("  [TROU] " + nom + " NON DETECTEE");
  }

  for (const [nom, muter] of mutations) { const m = muter(vente0); essayer(nom, m, demo0, obj0, par0, vente0, m); }
  for (const [nom, muter] of mutationsParcours) { const m = muter(par0); essayer(nom, vente0, demo0, obj0, m, par0, m); }
  for (const [nom, muter] of mutationsDemo) { const m = muter(demo0); essayer(nom, vente0, m, obj0, par0, demo0, m); }

  console.log("\nMutations attrapees : " + attrapees + "/" + total + (inertes ? "  (dont " + inertes + " inertes)" : ""));
  process.exit(attrapees === total ? 0 : 1);
}

/* ---------- Execution ---------- */
(async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--rouge")) return autoTestRouge();

  controler(lire("index.html"), lire("demo.html"), lire("OBJECTIONS.md"), lire("PARCOURS-ENTREE.md"));
  if (args.includes("--live")) { await verifierEnLigne(); await verifierRacine(); }

  console.log("FAYNA — harnais de preuve");
  console.log("  verts  : " + pass);
  console.log("  echecs : " + echecs.length);
  for (const e of echecs) console.log("    - " + e);
  process.exit(echecs.length === 0 ? 0 : 1);
})();
