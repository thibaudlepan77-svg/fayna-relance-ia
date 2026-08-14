# FAYNA — Parcours d'entrée bout en bout (découverte → mise en service)

> Règle axe : décrit de bout en bout, de la découverte à la mise en service. Transmissible à un commercial qui n'est pas Thibaud.

---

## Vue d'ensemble (5 étapes, ~10 min pour le client)

```
[1] DÉCOUVERTE      →  [2] DÉMO IMMÉDIATE    →  [3] PRIX & CHOIX      →  [4] CONTACT ÉDITEUR   →  [5] MISE EN SERVICE
Page de vente       Démo sans compte         Solo 5k / Pro 15k      Email / WhatsApp     Config + 1ère relance
(5 min lecture)     (2 min manip)            (1 min décision)       (2 min échange)      (5-10 min selon volume)
```

---

## Étape 1 — DÉCOUVERTE (Page de vente publique)

**URL :** `https://<username>.github.io/fayna-relance-ia/` (GitHub Pages)

**Contenu lu par le prospect :**
1. **Problème** : « Vos clients vous doivent de l'argent. FAYNA les relance à votre place. » — La douleur trésorerie n°1 des PME sénégalaises.
2. **Solution** : 5 niveaux d'escalade, bilingue FR/wolof, 1 clic WhatsApp, 100 % hors-ligne.
3. **Preuve** : KPI visuels (total dû, nb relances, plus ancien retard), capture d'écran du tableau de bord.
4. **Prix public affiché** : Solo 5 000 FCFA/mois • Pro 15 000 FCFA/mois — tableau comparatif clair.
5. **Objections** : Lien « Voir les 5 objections fréquentes » → ancre vers section OBJECTIONS.md.
6. **CTA principal** : **« Essayer la démo gratuite »** (bouton → ouvre `demo.html`).
7. **CTA secondaire** : **« Me contacter »** (email + WhatsApp éditeur).

**Garanties visibles :** Aucune donnée ne sort, IA optionnelle (BYOK), pas d'engagement, export CSV libre.

---

## Étape 2 — DÉMO IMMÉDIATE (Sans compte, données fictives)

**URL :** `https://<username>.github.io/fayna-relance-ia/demo.html`

**À l'ouverture (chargement unique) :**
- `localStorage` pré-rempli avec **3 débiteurs fictifs** :
  1. **Boutique Ndiaye** — 150 000 FCFA — échéance J-22 — niveau « Relance ferme » — relation habituel
  2. **Ets Fall & Frères** — 640 000 FCFA — échéance J-47 — niveau « Mise en demeure amiable » — relation sensible
  3. **Clinique Teranga** — 90 000 FCFA — échéance J-3 — niveau « Premier rappel » — relation nouveau
- Réglages par défaut : signature « Entreprise Diallo & Fils », canal « Wave ou Orange Money », lieu « Dakar ».

**Actions possibles en 2 min :**
1. **Voir le tableau de bord** : KPI (total 880 000 FCFA, 3 relances, plus ancien 47 jours), liste triée par priorité.
2. **Changer d'onglet langue** : FR / Wolof / FR+Wolof sur chaque fiche.
3. **Cliquer « Envoyer WhatsApp »** : s'ouvre `wa.me/221771234567?text=...` avec message pré-rempli (ne fait rien si pas d'app).
4. **Cliquer « Mise en demeure »** (niveau ≥ 2) : ouvre fenêtre imprimable OHADA, montant en toutes lettres.
5. **Cliquer « Proposer un échéancier »** : saisit 3 mensualités → message bilingue prêt à envoyer, somme exacte.
6. **Modifier un débiteur** (bouton « Modifier ») → change montant/date → re-génère message.
7. **Ajouter un 4e client** : formulaire complet → génère relance immédiate.
8. **Exporter CSV** : récupère le portefeuille avec historique relances.
9. **Tout effacer** : remet à zéro pour repartir propre.

**Aucune inscription, aucun email, aucune clé IA requise.** L'outil est 100 % fonctionnel hors-ligne.

---

## Étape 3 — PRIX & CHOIX (Sur page de vente)

**Tableau affiché :**

| | **Solo** — 5 000 FCFA/mois | **Pro** — 15 000 FCFA/mois |
|---|---|---|
| **Cible** | Commerçant/artisan seul, ≤ 30 clients | PME formelle 10-60 employés, clients illimités |
| **Relances** | Illimitées, 5 niveaux | Illimitées, 5 niveaux |
| **Langues** | FR + Wolof | FR + Wolof |
| **WhatsApp** | 1 clic | 1 clic |
| **Hors-ligne** | ✅ | ✅ |
| **IA personnalisation** | — | ✅ (clé gratuite client, sans surcoût) |
| **Priorisation risque** | — | ✅ |
| **Export CSV** | — | ✅ |
| **Mise en demeure OHADA** | ✅ | ✅ |
| **Échéancier négocié** | ✅ | ✅ |

**Règle :** Prix en FCFA, par mois, récurrent. Aucun frais caché. Arrêt quand on veut.

---

## Étape 4 — CONTACT ÉDITEUR (Passage à l'abonnement)

**Canaux affichés sur page de vente :**
- **Email :** `fayna@jaayleer.com` (ou adresse dédiée)
- **WhatsApp :** `+221 77 000 00 00` (numéro éditeur)

**Échange type (2-5 min) :**
1. Prospect choisit Solo ou Pro.
2. Éditeur confirme : prix, pas d'engagement, facture mensuelle.
3. Éditeur envoie **lien d'accès** (même URL `demo.html` mais avec paramètre `?mode=prod` ou page dédiée) + **guide de démarrage** (1 page PDF : config signature/canal, import CSV, cadence).
4. **Option IA** : si Pro, éditeur explique BYOK (Groq gratuit recommandé, pas d'entraînement). Le client colle sa clé dans l'onglet Réglages → « Personnaliser avec l'IA ».

**Pas de paiement en ligne** (zéro dépense, règle absolue). Facturation manuelle → virement Wave/Orange Money/banque. Abonnement activé à la réception.

---

## Étape 5 — MISE EN SERVICE (5-10 min selon volume)

**Côté client (autonome avec le guide 1 page) :**

1. **Ouvre le lien** → page `demo.html` (ou version prod).
2. **Réglages (1 min) :**
   - Saisie signature : « Mon Entreprise SARL »
   - Canal paiement : « Wave — 77 123 45 67 »
   - Lieu : « Dakar » (pour mise en demeure)
3. **Import clients (2-5 min) :**
   - **Option A — CSV** : Fichier `clients.csv` (colonnes : nom, telephone, montant, echeance, langue, relation) → bouton « Importer » (à construire, pour l'instant saisie manuelle).
   - **Option B — Manuel** : formulaire « Ajouter un client » × N (rapide pour ≤ 20).
4. **Première relance (1 min) :**
   - Le tableau trie par priorité (montant × ancienneté).
   - Clique « Envoyer WhatsApp » sur les 3-5 premiers.
   - Valide l'envoi → bouton « Relance envoyée » → historise la date.
5. **Cadence installée :**
   - Chaque fiche affiche « Prochaine relance conseillée : JJ/MM » (moteur : J+3, J+7, J+8, J+2 selon niveau).
   - Le client revient quand l'alerte s'affiche, clique, envoie, historise.

**Côté éditeur :**
- Suit l'activation (premier envoi = client « onboardé »).
- Relance J+7 si pas d'activité → « Besoin d'aide pour l'import ? »
- Facture mensuelle envoyée par email/WhatsApp.

---

## Résumé temps

| Acteur | Temps total |
|---|---|
| Prospect (découverte → démo → décision) | ~8 min |
| Éditeur (contact → facture → suivi) | ~5 min |
| Client (config + import + 1ère vague) | 5-15 min |

**Aucune étape technique complexe.** Tout se fait dans le navigateur. L'outil est la démo, la démo est l'outil.