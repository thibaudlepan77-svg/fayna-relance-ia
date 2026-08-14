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
