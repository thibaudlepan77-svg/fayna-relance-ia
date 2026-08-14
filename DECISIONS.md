# DECISIONS - FAYNA (Automate de recouvrement)

> **Règle** : Toute décision irréversible ou hors enveloppe (coût, licences, stack) est journalisée ici.
> Format : `Date | Décision | Raison | Statut (validé/aValider)`

---

## 2026-08-15

### 1. Stack technique
- **Décision** : Vanilla JS (HTML/CSS/JS natif) sans framework.
- **Raison** : 
  - 100 % hors-ligne (exigence métier).
  - Pas de build (simplicité, pas de `npm run dev`).
  - Compatible avec tous les hébergements gratuits (GitHub Pages, Vercel, Netlify).
- **Statut** : **Validé** (pas d'alternative plus simple).

### 2. Hébergement
- **Décision** : Vercel (gratuit, domaine personnalisable, build automatique).
- **Raison** : 
  - Gratuit pour les sites statiques.
  - Intégration GitHub native.
  - Domaine personnalisable (ex. : `fayna.vercel.app`).
- **Statut** : **aValider** (à confirmer après test de déploiement).

### 3. Licence
- **Décision** : MIT pour le code, CC BY-NC pour les templates de messages.
- **Raison** : 
  - MIT : permissif, compatible avec la revente.
  - CC BY-NC : interdit la réutilisation commerciale des messages (protection métier).
- **Statut** : **Validé** (conforme aux règles de l'axe).

### 4. Données fictives
- **Décision** : LocalStorage (persistance côté client).
- **Raison** : 
  - Pas de backend (100 % hors-ligne).
  - Réinitialisation possible via bouton.
  - Données générées dynamiquement (pas de fichier JSON statique).
- **Statut** : **Validé** (déjà implémenté dans `demo.html`).

### 5. Preuve de déploiement
- **Décision** : Validation manuelle (pas de build automatisé).
- **Raison** : 
  - Pas de dépendances (`package.json` vide).
  - Vérification visuelle suffisante (pas de logique serveur).
- **Statut** : **aValider** (à tester après déploiement).

---

## À valider avec l'utilisateur
- **Hébergement Vercel** : Confirmer que le domaine `fayna.vercel.app` est acceptable.
- **Preuve de déploiement** : Vérifier que la démo fonctionne après déploiement.