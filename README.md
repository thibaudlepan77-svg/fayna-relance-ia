# FAYNA — Assistant de relance des impayés (Sénégal)

Petit produit **autonome** et **vendable** : un outil web mono-fichier qui aide les PME et
commerçants du Sénégal à récupérer leurs impayés. On saisit qui doit combien, FAYNA rédige
le bon message de relance (bon ton, escalade graduée), **en français et en wolof**, prêt à
envoyer par **WhatsApp** en un clic.

C'est le **premier produit de l'axe « Automatisations IA vendables en autonome »** : une
ligne de produits DISTINCTE du CRM TEKKI (ni module, ni fonctionnalité du CRM), vendue
indépendamment.

## Ce que ça fait
- **5 niveaux d'escalade** automatiques selon le retard : rappel préventif → premier rappel →
  relance ferme → mise en demeure amiable → dernier avertissement.
- **Messages bilingues** français / wolof, ton adapté à la relation (habituel, nouveau, délicat).
- **Priorisation** des relances par « coût d'ignorance » (montant × ancienneté du retard).
- **Envoi WhatsApp** en un clic (lien `wa.me` pré-rempli), moyen de paiement Wave / Orange Money.
- **Mise en demeure formelle OHADA** imprimable (montant en toutes lettres), **échéancier de
  paiement négocié** à somme exacte, édition d'un impayé, historique des relances datées.
- **Hors-ligne** : toutes les données restent dans le navigateur. Rien n'est envoyé, sauf si
  l'option IA est activée (divulgué dans l'app : nom, montant et message partent alors chez le
  fournisseur choisi, avec la clé du client).
- **IA réelle câblée (BYOK)** : le client branche sa **propre clé gratuite** (Groq recommandé,
  sans entraînement sur les données ; Gemini possible) pour personnaliser les messages. Chaque
  réécriture du modèle traverse un **garde-fou mécanique** avant affichage : montant, date, nom,
  signature, canal de paiement intacts ; aucune menace, promesse, lien ou chiffre inventé.
  Facultatif ; l'outil est pleinement fonctionnel sans IA (repli déterministe).
- **Export CSV** du portefeuille d'impayés.

## Fichiers
- `index.html` — l'application complète (zéro dépendance, zéro ressource externe au chargement).
- `docs/verifier-fayna.js` — oracle Node zéro-dépendance : structure, honnêteté, hors-ligne,
  et la **logique réelle du moteur** (formats FCFA/date, seuils d'escalade, téléphone, WhatsApp,
  génération bilingue déterministe, garde-fou IA). **351 contrôles verts, exit 0**.
- `docs/ia-c65.js` — sonde de la couche IA (fetch simulé, hors-ligne) : garde-fou de sortie,
  appel robuste (délai, rejeu, cascade de modèles, promesse toujours réglée). **151 verts**.
- `docs/ia-live-c65.mjs` — sonde IA **en réel** (clés gratuites du `.env` de l'axe) : vérificateur
  indépendant anti-circularité, injections hostiles par champ non fiable. Dernier passage :
  24 appels réels, **0 faux accept**, 7/7 injections obéies par le modèle arrêtées par le garde-fou.
- `docs/rendu-c65.js`, `docs/axe-c62.js`, `docs/reflow-c62.js` — preuves navigateur (Puppeteer) :
  garde-fou câblé de bout en bout, 0 violation axe-core A/AA, 0 débordement à 320px.
- `data/bareme.json` — grille de prix de référence interne (Solo 5 000, Pro 15 000 FCFA/mois).

## Vérifier
```
node docs/verifier-fayna.js     # oracle complet (hors-ligne)
node docs/ia-c65.js             # couche IA, fetch simulé (hors-ligne)
node docs/ia-live-c65.mjs       # couche IA en réel (ignoré proprement sans clé)
```

## Honnêteté (verrouillée par l'oracle)
- Aucune garantie de recouvrement, aucune promesse de résultat.
- Aucun témoignage ni avis fabriqué.
- Renvoi explicite au cadre OHADA / huissier pour le recouvrement forcé.
- Aucune donnée client transmise à un serveur sans action de l'utilisateur : la fonction IA,
  optionnelle et désactivée par défaut, est divulguée à chaque occurrence de la promesse.
- La réécriture IA ne peut pas altérer le fond du message : contrôle mécanique, prouvé en réel
  (0 faux accept sur les derniers passages, injections hostiles arrêtées).

## Limites connues (frontières, prochains cycles)
- Version « DAF portefeuille » sur le socle `_core/` (import CSV en masse, multi-créances par
  débiteur) : à construire, c'est le portage prévu par l'axe.
- Relecture du wolof par un locuteur natif ; les modèles gratuits perdent parfois le wolof ou
  les accents (le garde-fou refuse alors la réécriture : coût de qualité mesuré, pas un risque).
- Rappels vraiment programmés, trésorerie prévisionnelle, multi-devises UEMOA.
- Relecture juriste OHADA praticien du texte de mise en demeure ; loi 2008-12 explicitée.
- Injonction de payer OHADA (modèle de requête formel).

## Ce qui reste une action de l'utilisateur (frontière NOYAU)
La mise en vente d'un abonnement, l'encaissement, et **l'envoi effectif** des messages
restent des actes de l'éditeur et de l'utilisateur. FAYNA prépare et rédige ; il n'envoie rien tout seul.
