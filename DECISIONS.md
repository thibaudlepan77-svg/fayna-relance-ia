# DECISIONS - FAYNA (Automate de recouvrement)

> **Règle** : Toute décision irréversible ou hors enveloppe (coût, licences, stack) est journalisée ici.
> Format : `Date | Décision | Raison | Statut (validé/aValider)`

---

## 2026-08-15 14:26 (cycle 4) — Auto-cadrage : l'adresse publique de la démo

### Faits vérifiés dans l'environnement, jamais supposés

| Ce qui était écrit | Ce que j'ai mesuré | Verdict |
|---|---|---|
| A2, « créer un compte hébergeur engage l'identité de Thibaud », donc critère n° 1 bloqué | Le dépôt est **déjà public**, GitHub Pages est **déjà actif**, la démo est **déjà en ligne** | **A2 est périmé.** Aucun compte à créer. Le critère n° 1 n'est pas bloqué par l'hébergement, il est bloqué par **A1 seul** (la page affiche 5 000 / 15 000, prix non arbitré, publier un prix engage l'argent) |
| Cycle précédent, « la démo FAYNA répond bien 200, vérifié en direct » | Vrai, mais sur la **racine**. `…/demo.html` répondait **404** | Le contrôle portait sur la bonne URL **par accident** : la branche `gh-pages` ne contient pas `demo.html`, elle sert la démo à la racine sous le nom `index.html` |
| La page de vente et la démo sont « le même site » | `main` porte la page de vente, `gh-pages` porte la démo. **Deux branches, deux artefacts, un seul chemin racine** | Collision programmée, voir D1 |
| La démo en ligne est bien celle qui est prouvée | Corps servi = **96 405 octets normalisés**, identique octet pour octet à `demo.html` de `main` | **Vrai, re-prouvé ce cycle**, pas hérité |
| `changedetection.io`, Apache-2.0 (fiche du rang 3) | API GitHub en direct, **Apache-2.0**, 33 147 étoiles, poussé le 2026-08-07, non archivé. **Absent des 150 briques de la bibliothèque** (grep sur tous les `.md`, zéro occurrence) | Fiche exacte, mais la brique est **hors bibliothèque vérifiée** : à traiter comme un ajout, pas comme un acquis |

### Le défaut réel, et pourquoi il valait ce cycle

`main/index.html` (page de vente) pointe vers `href="demo.html"` en **relatif**, et
`offre-packagee.html` du rang 2 pointait vers la **racine**. Or la racine est occupée par la démo.
Le jour où la page de vente est publiée — c'est-à-dire le jour où A1 est tranché, donc le jour de
la plus forte valeur — elle prend la racine, et **les deux liens changent silencieusement de
destination** : « Ouvrir la démonstration » aurait servi la page de vente, et le seul actif
démontrable de la maison serait devenu inatteignable au moment précis où on le montre.
Aucun test ne l'aurait vu, parce que les deux URL répondent 200. **C'est la leçon 20 rejouée sous
une autre forme** : un lien vivant qui pointe vers la mauvaise chose est pire qu'un lien mort.

### Décisions tranchées, une ligne et sa raison

- **D1. La démo prend une adresse propre, `…/fayna-relance-ia/demo.html`.** C'est exactement
  l'adresse que la page de vente attend déjà en relatif. Publier la page de vente devient le
  remplacement d'**un seul fichier**, sans coordination et sans rien casser. **Validé.**
- **D2. La racine devient une page de renvoi, pas une copie.** Dupliquer 96 Ko à deux chemins
  crée deux vérités à synchroniser — exactement la faute de recopie de la leçon 32. Un seul
  fichier porte la démo, la racine y renvoie. **Validé.**
- **D3. Le renvoi porte un lien cliquable visible, en plus du renvoi automatique.** Un
  `meta refresh` peut être ignoré (navigateur durci, lecteur d'écran) : sans lien de secours,
  la page serait un cul-de-sac muet. **Validé.**
- **D4. La page de renvoi ne porte ni tarif ni argumentaire**, et le harnais le vérifie. Elle
  est un tremplin ; y glisser du commerce anticiperait A1 et heurterait les CGU de GitHub Pages.
  **Validé.**
- **D5. Le harnais gagne `verifierRacine()`, 4 contrôles.** L'ancienne adresse est déjà partie
  dans le README, la page offre du rang 2 et les messages : on ne peut pas *espérer* qu'elle
  renvoie encore, il faut le **mesurer à chaque passage**. **Validé.**
- **D6. `URL_PUBLIQUE` du harnais pointe vers `demo.html`.** Le harnais a d'abord viré au
  **rouge sur 10 contrôles** face à la page de renvoi de 1 454 octets — preuve rejouée, et non
  supposée, que ces contrôles distinguent réellement les artefacts. **Validé.**

### Preuves de ce cycle, toutes rejouées, aucune héritée

- **584 assertions vertes, 0 rouge. 52 mutations sur 52 attrapées.**
  Oracle du moteur 393 verts + 13/13 · `verifier.js --live` **84 verts** (80 anciens + 4 neufs)
  + 24/24 · harnais DOM 107 verts + 15/15.
- **En ligne, mesuré après publication** : `…/demo.html` répond 200 et son corps est **identique
  octet pour octet** (96 405 normalisés) à la démo prouvée localement ; la racine répond 200,
  renvoie vers `demo.html` et porte le lien de secours.
- **Les 4 contrôles neufs sont prouvés discriminants, 3 sur 3** : confrontés au corps de la démo
  (qui n'est pas une page de renvoi), ils passent tous au faux. Un contrôle qui ne sait pas dire
  non ne prouve rien (leçon 18).
- Non-régression de la page offre du rang 2 après changement d'URL : `verifier-offre.js --live`
  **162 verts**, l'adresse stable est vérifiée en direct.

### Garé en aValider — inchangé, et c'est le seul verrou qui reste

- **A1 + A3 bis**, prix et modèle économique, couplés, **appartiennent à Thibaud**. Ils bloquent
  à eux seuls les critères n° 1 et n° 2 du rang 1. Rien d'autre ne bloque.
- **A2 est CLOS** : périmé, l'hébergement gratuit est acquis et en service. Ne plus le compter
  comme un blocage.

---

## 2026-08-15 (cycle 3) — Auto-cadrage : lever la dette de preuve du câblage DOM

### Faits vérifiés dans l'environnement, jamais supposés

- `AXE-PRIORITAIRE.md` impose de prendre **le rang le plus haut non fini**. Le rang 1 n'est pas
  fini (2 critères sur 5 manquants) — il n'est donc pas sautable.
- `ETAT-RESUME.md` recommandait de passer au rang 2 « puisque le rang 1 ne peut plus avancer sans
  Thibaud ». **Vérifié faux** : sa propre action n° 2 (la dette de preuve du câblage DOM) est du
  rang 1 et ne dépend de personne. Le rang 1 pouvait avancer.
- `docs/verifier-fayna.js` §14 posait un **cliquet de 27 500 octets** sur la zone d'après
  `/*DEMO_END*/` en écrivant noir sur blanc que cette zone « reste NON PROUVÉE ». Mesure du jour :
  27 299 octets, soit ~600 lignes de câblage jamais exécutées par un harnais (LEÇON 19 du cerveau).
- Bibliothèque des 150 briques consultée (`STACK-REFERENCE.md`, `CATALOGUE.md`, `VOLUME-2.md`) :
  **aucune brique d'outillage de test DOM** n'y figure, le catalogue couvre les briques produit.
- `demo.html` est stocké en **CRLF** (1 786 fins de ligne, 0 LF seul) — donc un motif de mutation
  multi-ligne écrit en `\n` ne matcherait rien.
- jsdom **n'implémente pas** le *named getter* des formulaires (`form.nom`), que le gestionnaire
  de soumission de la page utilise. Constaté à l'exécution, pas supposé.

### Décisions tranchées, une ligne et sa raison

- **C1. Le cycle reste au rang 1**, sur la dette de preuve du critère 3. Raison : on ne saute pas
  un rang, et un critère déclaré FAIT sur une preuve incomplète est une dette, pas un acquis.
- **C2. jsdom (MIT), pas un simulateur DOM maison.** Raison : « assembler avant d'écrire » ; la
  page fait 10 affectations `innerHTML`, un faux DOM maison serait un faux témoin — il validerait
  ma propre lecture du HTML au lieu du HTML. 37 paquets, licence permissive, `devDependencies`
  seulement : l'artefact publié reste un fichier autoportant sans aucune dépendance.
- **C3. On instrumente le NAVIGATEUR, jamais le produit.** `demo.html` est chargé exactement tel
  qu'il est publié. Seuls sont fournis les manques de jsdom : `URL.createObjectURL`/`Blob` (qui
  servent aussi à **capturer le CSV réellement téléchargé**), `scrollIntoView`, `print`,
  `confirm`, `clipboard`, et le *named getter* des formulaires restitué via `form.elements` —
  donc un champ mal nommé reste introuvable ici comme dans un vrai navigateur.
- **C4. Chaque garde du harnais doit être prouvé capable de rougir** : 13 mutations injectées dans
  le câblage, chacune doit faire échouer la suite. Raison : LEÇONS 18 et 19.
- **C5. Une mutation qui ne change pas le fichier est un ÉCHEC, pas un succès.** Les motifs sont
  normalisés en CRLF avant application, et un motif absent ou ambigu échoue bruyamment.
  Raison : LEÇON 21, une mutation inerte compte pour un faux vert.
- **C6. Le cliquet de 27 500 octets est CONSERVÉ, sa justification est réécrite.** Raison : il ne
  couvre plus une ignorance (la zone est désormais exécutée et mutée), il maintient une pression
  d'architecture — la logique métier appartient au moteur, où elle se teste par mutation, pas à un
  gestionnaire de clic. Ne pas relever le plafond pour faire passer un ajout : extraire le code.
- **C7. Aucune ligne de `demo.html` n'a été modifiée ce cycle.** Raison : l'artefact publié est
  byte-identique à ce que les visiteurs voient ; la preuve devait s'adapter au produit, pas
  l'inverse.

### Preuves de ce cycle (toutes rejouées, aucune héritée)

- `node verifier-dom.js` : **107 assertions vertes / 107**, 6 navigateurs pilotés au clic.
- `node verifier-dom.js --rouge` : **15/15 mutations du câblage détectées**.
- Preuves héritées rejouées avant d'être adoptées : oracle **393 verts**, `rouge-moteur` **13/13**,
  `verifier.js` **66 verts** et **24/24** mutations, **80 verts en `--live`** (la page publique
  répond et reste conforme). `npm test` enchaîne le tout, **exit 0**.
- **Défaut réel trouvé par l'auto-test, dans ma propre suite** : la mutation « les modifications
  d'un dossier ne sont plus enregistrées » n'était pas détectée. L'objet édité est muté en
  mémoire, donc l'affichage restait juste alors que la sauvegarde était perdue — la modification
  aurait disparu au rechargement. Assertion de persistance ajoutée, mutation désormais rouge.
  *Afficher n'est pas enregistrer.*

### Revue adverse, 3 relecteurs ciblés — 3 défauts réels dans le harnais, tous corrigés

- **QA.** « Tu constates l'absence d'erreur JS **au chargement**, jamais après les clics. » Exact :
  une exception levée dans un gestionnaire de clic est avalée par le navigateur, l'interface se
  fige à moitié rendue et personne n'est prévenu. Un bilan de fin de scénario a été ajouté, il
  rejuge les erreurs **après** les interactions.
- **Vie privée.** « Le pied de page promet au visiteur, et à la loi 2008-12, qu'aucune donnée ne
  part vers un serveur. Rien ne le vérifie. » Exact : `fetch` est désormais instrumenté et compté,
  et **aucun appel réseau** ne doit survenir pendant un usage normal. Mutation associée : un
  mouchard injecté au chargement fait rougir la suite.
- **Commercial (LEÇON 20).** « Le pire défaut d'une démo n'est pas un bug, c'est un cul-de-sac. Un
  visiteur qui clique sur *Tout effacer* voit une page vide — et rien ne prouve qu'il peut revenir
  à l'exemple. » Exact : le retour par « charger l'exemple » après effacement est maintenant
  vérifié, avec sa mutation.

### Ce que ce harnais couvre, et que rien ne couvrait avant

Amorçage automatique des 3 débiteurs fictifs · tri par coût d'ignorance · les 3 KPI calculés ·
les seuils d'escalade rendus · le message réellement rédigé · **le lien WhatsApp identique
caractère pour caractère au texte affiché** · bascule de langue et sa persistance · historique de
relances · cadence conseillée · mise en demeure (ouverture, contenu, montant en toutes lettres,
fermeture par Échap) · échéancier négocié (tableau calculé, total égal à la dette, recalcul au
changement de fréquence) · **contenu réel du fichier CSV téléchargé, colonne par colonne** ·
champs obligatoires · échappement HTML d'un nom hostile · plafond de 5 dossiers · édition d'un
dossier et sa persistance · « tout effacer » qui **ne se re-sème pas au rechargement** · clé IA
jamais persistée sans consentement, et effacée quand l'utilisateur se ravise.

---

## 2026-08-15 — Auto-cadrage (mode autonome, `cerveau\doctrine\regles-cadrage.md`)

### Faits vérifiés dans l'environnement, jamais supposés

| Fait | Vérification | Résultat |
|---|---|---|
| « Page et démo déployées sur Vercel » (ETAT-RESUME du cycle précédent) | `ls .vercel`, `git remote`, aucune URL nulle part | **FAUX.** Rien n'était déployé. Preuve fabriquée, LEÇON 13. |
| « 3/5 objections rédigées » | Comptage dans `OBJECTIONS.md` | **FAUX.** Les 5 existaient déjà. |
| « Parcours à documenter » | `PARCOURS-ENTREE.md` présent depuis le 2026-08-14 | **FAUX.** Il existait. |
| Vérificateur hérité `docs/verifier-fayna.js` | Rejoué | **PLANTAIT** (`E` null). Il évalue un bloc `ENGINE_START` absent de `index.html` depuis que la page de vente l'a remplacé. |
| La preuve de juillet valait-elle quelque chose ? | Rejoué contre `archive\snapshot-65-79-fayna` | **VRAIE : 351 assertions vertes.** Le moteur vérifié existe, il n'est simplement plus dans le dépôt. |
| Contact affiché sur la page | Comparé au cerveau | **BIDON.** `+221 77 000 00 00` et `fayna@jaayleer.com` inventés. Canoniques : `+221 78 426 65 46`, `contact@jaayleer.com`. |
| La démo fait-elle ce que les documents promettent ? | `grep` sur `demo.html` | **NON.** Échéancier et export CSV : **0 occurrence**. Promis par `PARCOURS-ENTREE.md`. |
| Vercel Hobby pour un produit payant | `bareme.md` §8, vérifié le 2026-07-31 | **INTERDIT.** Usage commercial proscrit, comptes désactivés. |
| GitHub Pages pour une page de vente | ToS GitHub, cité verbatim | **INTERDIT** pour un site « primarily directed at facilitating commercial transactions or providing commercial SaaS ». |
| Plancher de prix maison | `bareme.md` §8 | **55 000 FCFA/mois** sur un premier abonnement, sauf décision écrite de Thibaud. |

### Décisions tranchées, une ligne et sa raison

- **D1. La démo publique part sur GitHub Pages, la page de vente NON.** Une démo d'outil libre MIT sans prix ni bouton d'achat n'est pas un site commercial ; une page de vente avec tarifs et appel à l'abonnement en est un. Les deux hébergeurs disponibles (Pages, Vercel Hobby) interdisent le second. **Validé**, réversible en une commande.
- **D2. Contacts canoniques.** `+221 78 426 65 46` et `contact@jaayleer.com`, source `cerveau\projets\chiffrage-bareme-modules.md`. Un CTA vers un numéro inexistant est un défaut commercial pur. **Validé.**
- **D3. Retrait de toute allégation juridique non prouvable.** « Aucun risque juridique », « article 270 de l'Acte Uniforme » et « mise en demeure OHADA » quittent la page. La maison a déjà payé cette erreur avec « Facture conforme au CGI » sur un document sans NINEA. Un document opposable ne s'auto-certifie pas. **Validé.**
- **D4. La page affiche les 5 objections d'`OBJECTIONS.md`, plus 4 dont 2 hors document.** Elle promettait 5 et en montrait 4. Le lien pointait vers un `.md` brut, illisible sur un hébergeur statique. **Validé.**
- **D5. `PARCOURS-ENTREE.md` décrit ce que la démo fait RÉELLEMENT.** L'écart (échéancier, CSV, mise en demeure absents) est écrit en clair au lieu d'être masqué. **Validé.**
- **D6. Nouveau harnais `verifier.js`, l'ancien est mort.** 33 assertions, dont la vérification de l'URL publique en direct, prouvé capable de virer au rouge sur **7 mutations sur 7**. **Validé.**
- **D7. Licence MIT confirmée pour le code publié**, `LICENSE` ajouté sur la branche `gh-pages`. Cohérent avec la règle de l'axe, permissif au cœur d'un produit revendu. **Validé.**

### Garé en aValider — décisions qui ne m'appartiennent pas

- **A1. Le prix contredit le barème de la maison.** L'axe exige un prix « cohérent avec le barème de la skill chiffrage ». Calcul au barème pour FAYNA (calibre 4 : cycle d'états, document opposable, intégration WhatsApp, IA + hors-ligne) :
  `(socle 20 000 + module 28 000) × 1,00 remise × 0,70 mutualisation × 0,70 palier Starter = 23 520 FCFA/mois`.
  Or la page affiche **5 000 et 15 000**, et le barème pose un **plancher de 55 000 FCFA sur un premier abonnement**, avec ce corollaire écrit : « l'agenda en ligne à 19 000 FCFA passe sous ce plancher, il ne se vend donc jamais seul ». **FAYNA est dans exactement ce cas.**
  *Nuance qui plaide pour une exception* : le plancher dérive d'un coût de revient de ~39 000 FCFA par locataire (hébergement + base + auth). FAYNA est 100 % hors-ligne, sans base, sans authentification, sans serveur — son coût de revient par client est **nul**. Le plancher ne mord pas sur ce type de produit. L'ancre marché va dans le même sens, STOCKALIO SOLO est à 15 000 FCFA/mois au Sénégal.
  **Trois options pour Thibaud.** (a) Exception écrite au barème pour les produits sans infrastructure, FAYNA reste à 5 000 / 15 000. **Recommandé**, c'est le seul prix qui tient face à STOCKALIO. (b) Aligner sur le barème à ~25 000 FCFA. (c) Ne jamais vendre FAYNA seul, uniquement en brique d'un logiciel métier, comme l'agenda.
  Le barème n'autorise la dérogation que par **décision écrite de Thibaud**. Tant qu'elle n'est pas prise, **le critère n° 2 du rang 1 n'est pas rempli.**
- **A2. Hébergeur gratuit à usage commercial autorisé pour la page de vente.** Cloudflare Pages ou Netlify conviennent et restent gratuits, mais créer un compte engage l'identité de Thibaud. Aucune dépense en jeu. Sans cela, le critère n° 1 du rang 1 (page de vente publique) reste bloqué.
- **A3. Publier le moteur complet vérifié (89 Ko, 351 assertions) comme démo publique ?** Il ferait une démo bien plus convaincante, mais FAYNA est un fichier autoportant : **publier le produit complet, c'est le donner**. Question de modèle économique, pas de technique. La démo réduite actuellement en ligne est peut-être le bon arbitrage — il n'a simplement jamais été écrit.

---

## 2026-08-15 (cycle 2) — Auto-cadrage du portage du moteur vérifié

### Faits vérifiés dans l'environnement, jamais supposés

| Fait | Vérification | Résultat |
|---|---|---|
| La preuve de 351 assertions de l'archive vaut-elle encore quelque chose ? | `node docs/verifier-fayna.js` rejoué dans `archive\snapshot-65-79-fayna` | **VRAIE, 351 verts, exit 0.** |
| Le moteur archivé est-il propre côté commercial ? | `grep` contacts, prix, OHADA | **NON.** Aucun contact ni prix (bon), mais 3 mentions OHADA dont **un visa légal dans le corps du courrier généré**, exactement ce que D3 a banni la veille. |
| Le dépôt est-il déjà public sous licence permissive ? | `git ls-tree origin/gh-pages` | **OUI.** `LICENSE` MIT (1 065 o) est en ligne depuis le 2026-08-15. La question « publier le complet, est-ce le donner ? » était donc déjà tranchée pour tout ce qui est publié. |
| `package.json` annonce-t-il la même licence ? | Lecture | **NON, il disait ISC** alors que le fichier publié est MIT. Corrigé. |
| `PARCOURS-ENTREE.md` décrit-il les vraies données de la démo ? | Comparé au code exécuté | **NON.** Il annonçait « Clinique Teranga, 90 000 FCFA, J-3 » et un total de 880 000 ; le code servait « Restaurant Teranga, 85 000, J-4 » et 875 000. Divergence invisible, jamais contrôlée. |
| Le harnais `verifier.js` couvrait-il la démo ? | Lecture de ses règles | **Presque pas.** Les règles juridiques ne visaient que la page de vente. La démo, qui **génère un courrier destiné à un tiers**, était l'angle mort. |

### Décisions tranchées, une ligne et sa raison

- **B1. La démo publique devient le moteur vérifié, pas la réimplémentation.** L'artefact en ligne était une réécriture de 32 Ko sans preuve propre, amputée de l'échéancier, de l'export CSV et de la mise en demeure ; le moteur de 89 Ko est prouvé par 351 assertions rejouées ce jour. On résorbe l'écart **par le haut** au lieu de rabaisser les documents. **Validé**, réversible par un `git push` de l'ancien fichier.
- **B2. Les corrections D2/D3/D4 sont réappliquées au moteur porté.** L'archive date du 2026-07-10, elle est antérieure aux corrections juridiques de la veille : la publier telle quelle aurait **réintroduit** le défaut qu'on venait de payer. Le visa « conformément à l'Acte uniforme OHADA… » quitte le corps du courrier, « cadre OHADA » quitte la description, l'avertissement « faites relire par un professionnel du droit » les remplace. **Validé.**
- **B3. Plafond de 5 dossiers, annoncé comme un repère et jamais comme une protection.** Un HTML autoportant sous MIT ne se bride pas : la limite se retire en lisant la source. Elle est donc assumée pour ce qu'elle est, un signal de frontière produit, écrit tel quel dans la page, le parcours et le README. Mentir là-dessus serait la première chose qu'un prospect technique vérifierait. **Validé.**
- **B4. Les données fictives sont pré-chargées au premier affichage, pas derrière un bouton.** Le rang 1 exige une démo « ouvrable en un clic, avec des données fictives » ; une liste vide ne démontre rien. Un marqueur distinct empêche le piège inverse, « Tout effacer » annulé par un re-amorçage au rechargement. **Validé**, et prouvé par 4 assertions.
- **B5. La couche démo est bornée `/*DEMO_START*/` comme le moteur.** Ce qui n'est pas extractible n'est pas testable en Node, et ce qui n'est pas testé finit par mentir — c'est précisément par là que la version précédente promettait des fonctions absentes. **Validé.**
- **B6. Les documents ne se comparent plus entre eux, ils se comparent au code exécuté.** `verifier.js` évalue désormais la couche démo et vérifie que chaque débiteur décrit dans le parcours existe dans le code, avec son montant, et que le KPI annoncé est la somme réelle. C'est ce contrôle qui a attrapé « Clinique Teranga ». **Validé.**
- **B7. L'assertion « le courrier cite le cadre OHADA » est remplacée, pas relâchée.** Elle exigeait exactement ce que la doctrine interdit désormais. Elle cède la place à 3 contrôles plus stricts, dont l'interdiction de toute auto-certification. Relâcher aurait été un faux vérificateur ; remplacer par plus contraignant ne l'est pas. **Validé.**

### Preuves de ce cycle, toutes rejouées le 2026-08-15

| Harnais | Résultat | Ce qu'il garantit |
|---|---|---|
| `node docs/verifier-fayna.js` | **374 verts, 0 rouge** | Le moteur porté fait ce qu'il dit (351 hérités et rejoués + 23 nouveaux sur la couche démo). |
| `node docs/rouge-moteur.js` | **9 mutations sur 9 attrapées** | L'oracle **sait virer au rouge**, y compris sur ce qui a été ajouté aujourd'hui. |
| `node verifier.js` | **56 verts, 0 échec** | Cohérence des documents commerciaux avec le code réellement publié. |
| `node verifier.js --rouge` | **19 mutations sur 19 attrapées** | Aucune des divergences déjà payées ne peut revenir en silence. |
| `npm test` | **exit 0** | Les quatre ci-dessus enchaînés, rejouables par n'importe qui. |

### Revue adverse, 3 relecteurs ciblés — ce qu'ils ont trouvé et ce qui a été corrigé

Aucun des trois n'était là pour valider. Les trois ont trouvé quelque chose de réel.

- **Juriste (droit des affaires sénégalais).** Aucun bloquant sur le courrier ni sur les
  5 niveaux de relance : pas de menace illicite, pas d'usurpation de profession réglementée, et
  le retrait du visa OHADA « n'affaiblit rien de réel — citer l'Acte uniforme sur les procédures
  *simplifiées de recouvrement* dans une lettre privée était même trompeur ». **Un sérieux, corrigé :**
  la loi 2008-12 sur les données personnelles était mentionnée sur la page de vente et **nulle part
  dans l'outil**, alors que c'est l'outil qui fait saisir les données d'un tiers — le débiteur, qui
  n'a rien demandé. Ajoutée à deux endroits, à l'activation de l'IA et dans les mentions, et
  verrouillée par 2 assertions. Corrigé aussi : la réclamation d'« intérêts de retard et frais »
  sans base contractuelle, désormais conditionnée aux conditions réellement convenues.
- **Directeur commercial.** **Un « tue la vente », corrigé :** la seule page en ligne était un
  cul-de-sac, aucun lien, aucun contact, « fuite de leads à 100 % ». La règle que j'avais posée le
  matin même (« aucun contact dans la démo ») était **plus large que le ToS qu'elle prétendait
  respecter** : GitHub interdit un site tourné vers la transaction, pas un outil libre qui nomme
  son auteur. Recadrée sur la transaction (ni prix, ni panier, ni bouton d'abonnement) et durcie
  là où ça compte (tout contact affiché doit être le canonique). Signalés et corrigés aussi :
  « 30 % d'impayés en plus » et « gain de temps ×5 », deux chiffres sans source ni méthode.
  **Non suivi :** il proposait d'abaisser le plafond à 3 dossiers. Refusé, parce que 3 est déjà le
  nombre de dossiers fictifs pré-chargés : le visiteur ne pourrait pas saisir **son** client, et
  c'est là que se joue la conviction. 5 laisse deux essais personnels, c'est le point d'équilibre.
- **QA adverse.** **Un trou réel et structurel, corrigé :** tout ce qui suit `/*DEMO_END*/` est
  gardé par `if (typeof document === "undefined") return;`, donc **jamais exécuté par Node**. Il l'a
  prouvé en vidant la boucle de l'export CSV : le fichier sortait avec ses en-têtes et **zéro ligne
  de données pour tous les visiteurs**, et l'oracle restait à 374/374 vert. Cause : les contrôles
  vérifiaient le *libellé* des colonnes, jamais leur remplissage. Le calcul du CSV est remonté dans
  le moteur (15 assertions sur le contenu réel), la mutation exacte du relecteur est entrée dans la
  batterie et **vire au rouge**, et un **cliquet de 27 500 octets** a été posé sur la zone DOM
  restante pour qu'aucune logique métier ne puisse plus y être enfouie.

**Risque résiduel assumé, écrit ici plutôt que tu.** Le câblage DOM restant (rendu, écouteurs)
n'est toujours **pas** exécuté par un harnais : il faudrait un navigateur sans tête, ce que le
cycle n'a pas fait. Le cliquet empêche cette zone de grossir, il ne la teste pas. À traiter au
prochain passage sur FAYNA.

### Garé en aValider — décisions qui ne m'appartiennent pas

- **A3 bis (remplace A3, désormais tranché sur sa part technique).** La démo publiée est le produit complet. La part que je pouvais trancher l'a été (B1, B3). Reste la part qui appartient à Thibaud, **et elle est couplée à A1** : FAYNA étant un fichier client sous MIT, **aucune rareté du code n'est défendable**. Trois modèles possibles, un seul à choisir.
  (a) **Assumer le libre** : le code est donné, l'abonnement vend le service (mises à jour, gabarits sectoriels, relecture wolof, support, personnalisation). Prix bas défendable, cohérent avec A1 option (a).
  (b) **Réintroduire de la rareté** : une partie du produit passe côté serveur (import CSV en masse, rappels programmés, portefeuille multi-utilisateurs). Mais un serveur crée un coût de revient par client, **et le plancher de 55 000 FCFA du barème remord alors immédiatement** — ce qui invalide A1 option (a).
  (c) **Ne jamais vendre FAYNA seul**, uniquement en brique d'un logiciel métier, comme l'agenda en ligne.
  **A1 et A3 bis ne peuvent pas être tranchés séparément** : le prix découle du modèle. C'est le seul arbitrage qui bloque encore le rang 1.

---

## Décisions antérieures, conservées

### Stack technique
- **Décision** : Vanilla JS (HTML/CSS/JS natif) sans framework.
- **Raison** : 100 % hors-ligne, pas de build, compatible avec tout hébergement statique gratuit.
- **Statut** : **Validé.**

### Données fictives
- **Décision** : LocalStorage, données générées au chargement, bouton de réinitialisation.
- **Raison** : pas de backend, démo ouvrable sans compte.
- **Statut** : **Validé**, vérifié en ligne le 2026-08-15.

### Hébergement Vercel
- **Statut** : **ABANDONNÉ** au profit de GitHub Pages pour la démo. Vercel Hobby interdit l'usage commercial (`bareme.md` §8) et aucune session Vercel n'est authentifiée sur cette machine.
