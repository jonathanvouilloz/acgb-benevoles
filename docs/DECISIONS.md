# DECISIONS — Bénévoles ACGB

Log des décisions techniques importantes.

| Date       | Décision                                         | Contexte                                                                 | Alternatives considérées                                                                                 |
| ---------- | ------------------------------------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| 2026-06-22 | Auth en **magic link** (Better Auth)             | Public non-technique (membres de clubs), friction minimale, cohérent PWA | Email + mot de passe (rejeté : trop de friction) ; nom+email sans compte (rejeté : notifs push fragiles) |
| 2026-06-22 | **Base Neon dédiée**, pas de couplage WordPress  | MVP simple et découplé de acgb.ch                                        | Branchement direct WordPress (rejeté : couplage fort) ; import CSV (reporté en option de lancement)      |
| 2026-06-22 | SSO WordPress ACGB **reporté en V2**             | Argument fort (« j'ai déjà un compte sur acgb.ch ») mais hors scope MVP  | Faire le SSO direct (rejeté : trop lourd pour un MVP)                                                    |
| 2026-06-22 | Modèle **Poste → N Créneaux** (plage + capacité) | Besoin de flexibilité max (ex. buvette 7h-9h 2 pers., 9h-12h 1 pers.)    | Créneau = 1 mission unique (rejeté : pas assez flexible)                                                 |
| 2026-06-22 | **Push notifications dans le MVP**               | Vrai intérêt du PWA : éviter les oublis d'inscription                    | Reporter en V2 (rejeté : jugé important par le client)                                                   |
| 2026-06-22 | Couleur de poste **auto-assignée**               | Réduire la friction de création côté orga                                | Sélecteur manuel (rejeté : friction inutile)                                                             |
| 2026-06-22 | Email via **Resend**                             | Choix explicite client                                                   | Brevo (disponible mais non retenu)                                                                       |
| 2026-06-22 | **PWA = service worker natif SvelteKit**         | `@vite-pwa/sveltekit` incompat avec config-in-`vite.config.ts` (pas de `svelte.config.js`) | `@vite-pwa/sveltekit` (rejeté : fragile) ; `generateSW` (rejeté : pas besoin de Workbox au MVP)         |
| 2026-06-22 | **PK uuid** (domaine) + `user.id` text           | Liens publics non énumérables ; compat Better Auth (Epic 2)              | serial (rejeté : énumérable)                                                                              |
