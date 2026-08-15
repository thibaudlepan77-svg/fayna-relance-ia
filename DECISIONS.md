# DECISIONS - FAYNA (Automate de recouvrement)

> **Règle** : Toute décision irréversible ou hors enveloppe (coût, licences, stack) est journalisée ici.
> Format : `Date | Décision | Raison | Statut (validé/aValider)`

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
