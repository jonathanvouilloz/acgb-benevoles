# DESIGN — Bénévoles ACGB

Socle design du produit. Source de vérité pour l'UI (humains + agents). Charte dérivée du site officiel **acgb.ch** (thème WordPress).

## 1. Essence

Un outil **clair, institutionnel et sportif** : on doit sentir l'ACGB (marine + teal), la fiabilité d'une association cantonale, et la simplicité d'un outil qu'on utilise debout, sur son téléphone, entre deux matchs. Efficace avant d'être joli — chaque écran répond à « qui tient quel poste, quand ».

**Anti-essence** : jamais chargé ni corporate-froid, jamais ludique/gamifié, jamais une web-app dense de tableurs. Pas de rouge « alerte » comme couleur d'ambiance.

## 2. Voix & ton

- Direct, chaleureux, associatif. On tutoie le bénévole.
- **Microcopy boutons (verbes exacts)** :
  - `Je suis dispo` · `Peut-être` · `Me désinscrire`
  - `Créer un tournoi` · `Ajouter un poste` · `Ajouter un créneau`
  - `Partager le lien` · `Recevoir un lien de connexion`
- États vides : encourageants et concrets (« Aucun créneau pour l'instant — ajoute le premier »).

## 3. Couleurs

Light only. Aucune couleur en dur dans les composants — **tokens uniquement**.

| Token                 | Valeur    | Usage                                               |
| --------------------- | --------- | --------------------------------------------------- |
| `--brand-primary`     | `#020E71` | Marine ACGB — actions principales, en-têtes, liens  |
| `--brand-primary-700` | `#0A1A8C` | Hover du primaire                                   |
| `--brand-secondary`   | `#2AC5A1` | Teal ACGB — statut « disponible », accents positifs |
| `--brand-tertiary`    | `#6F76DE` | Périwinkle — accents secondaires, tags              |
| `--brand-cyan`        | `#40D9F1` | Cyan — highlights ponctuels (parcimonie)            |
| **Surfaces**          |           |                                                     |
| `--surface-page`      | `#FDFDFC` | Fond de page (blanc cassé)                          |
| `--surface-bg`        | `#FFFFFF` | Cards & surfaces pures (blanc pur)                  |
| `--surface-subtle`    | `#F5F7FA` | Cartes, zones secondaires                           |
| `--surface-muted`     | `#ECEFF4` | Fonds désactivés, séparateurs doux                  |
| `--border`            | `#E2E6EC` | Bordures, lignes                                    |
| **Ink (texte)**       |           |                                                     |
| `--ink-strong`        | `#0A1230` | Titres                                              |
| `--ink`               | `#1E2433` | Texte courant                                       |
| `--ink-muted`         | `#5B6273` | Texte secondaire, légendes                          |
| `--ink-on-primary`    | `#FFFFFF` | Texte sur fond marine                               |
| **Sémantiques**       |           |                                                     |
| `--success`           | `#2AC5A1` | « Disponible », confirmation (= teal marque)        |
| `--warning`           | `#E0A21E` | « Peut-être », créneau presque plein                |
| `--error`             | `#E2342B` | Créneau complet, désinscription, erreurs            |
| `--info`              | `#6F76DE` | Infos neutres                                       |

**Règles d'association :**

- Marine = couleur d'action et de structure. Teal = positif/disponible. Périwinkle = accent doux.
- **Statuts d'inscription** : `disponible` → teal · `peut-être` → ambre (`--warning`) · `complet` → rouge (`--error`). Toujours **forme + couleur** (icône/label), jamais la couleur seule (accessibilité).
- Cyan et le sable historique : décoratifs et rares. Jamais en fond de texte long.

## 4. Typographie

- **Famille cible** : `Euclid Flex` (charte ACGB, licence commerciale). **Fallback libre** : `Manrope` (géométrique humaniste très proche), puis `Inter`, `system-ui`.
- Stack : `"Euclid Flex", "Manrope", "Inter", system-ui, sans-serif`.
- **Échelle** (classes globales) :
  - `.display` 2rem/700 · `.h1` 1.5rem/700 · `.h2` 1.25rem/600 · `.h3` 1.0625rem/600
  - corps `1rem/400` · légende `.small` 0.875rem/400 muted
- Chargement : Manrope via Fontsource (poids 400/500/600/700), preload 400+700. Euclid Flex en `@font-face` local si fichiers licenciés fournis.
- **Do** : titres en 600/700, corps en 400, hiérarchie par la taille et le poids. **Don't** : pas de gras décoratif sur de longs paragraphes, pas plus de 3 niveaux de titre par écran.

## 5. Spacing, radius, ombres, breakpoints

- **Espacement** (sparse, mobile-first) : échelle 4 → 8 → 12 → 16 → 24 → 32 → 48. Gutter mobile 16px, section-y 24–32px.
- **Densité compacte** (norme actuelle) : contrôles à **32px** de hauteur — boutons `size="sm"` (défaut de fait) et champs `Input`/`Select` (`min-h-8`, `text-sm`, `rounded` 8px). Cohérence bouton ↔ champ.
  - ⚠️ Sous la cible tactile historique de 44px : réserver aux écrans denses orga ; surveiller le confort tactile mobile.
  - ⚠️ Champs en `text-sm` (14px) : iOS Safari peut zoomer au focus (police < 16px). À arbitrer si gênant.
- **Radius** : `--radius-sm 6px` · `--radius 8px` (défaut) · `--radius-lg 14px` · `--radius-full 999px`.
- **Ombres** : `--shadow-sm` (cartes), `--shadow-md` (modals/menus). Discrètes.
- **Breakpoints** : `sm 640` · `md 768` · `lg 1024`. Le design part du mobile, mais **desktop/iPad sont des cibles de plein droit** (pas une simple colonne mobile étirée).
- **Navbar** : barre supérieure sticky (`components/nav/Navbar.svelte`). Desktop (`md+`) : liens inline + actions (badge rôle / switch de vue, compte, déconnexion). Mobile (`< md`) : brand + bouton menu → panneau déroulant empilé.
- **Largeur de contenu adaptée à la route** (gérée dans `+layout.svelte`, fin de la colonne 640 unique) :
  - Formulaires & lecture (accueil, compte, login) → `max-w-2xl` centré.
  - Inscription bénévole `/t/[token]` & gestion tournoi `/tournois/[id]` → `max-w-3xl`.
  - Listings (`/tournois`, `/tournois-publics`, `/admin/*`) → `max-w-5xl` avec **grilles multi-colonnes** (`sm:grid-cols-2 lg:grid-cols-3`) pour occuper le desktop intentionnellement.
  - Matrice de suivi → `max-w-[95vw]` (la page centre son propre chrome en `max-w-5xl`).

## 6. Photographie & art direction

Pas de photo dans l'app (outil utilitaire). Si visuel ponctuel : photos d'action badminton de la banque ACGB, cadrage dynamique, jamais de stock générique. Illustration : aucune au MVP.

## 7. Iconographie & motifs

- **Un seul set** : `lucide-svelte` (cohérent, épuré, qui matche le ton institutionnel-sport).
- Taille par défaut 20px, stroke 1.75. Couleur héritée de l'ink courant.
- Motif de marque : éventuel volant de badminton stylisé en accent (V2, pas MVP).

## 8. Motion

- **Intensité : 5/10** — animations de feedback utiles, rien de spectaculaire. L'app doit paraître réactive, pas « démo ».
- Tokens : `--dur-fast 150ms` / `--dur-base 250ms` / `--dur-slow 450ms` / `--dur-reveal 600ms`,
  `--ease-out-strong cubic-bezier(0.23,1,0.32,1)`, `--ease-in-out-strong cubic-bezier(0.77,0,0.175,1)`, `--ease-drawer cubic-bezier(0.32,0.72,0,1)`.
- **Moves signature** (2-3 max) :
  - Confirmation d'inscription : check + léger pop du statut (scale 0.96→1, fade), `--dur-base`.
  - Apparition de liste (créneaux/postes) : fade-up doux, stagger 50ms.
  - Drawer/sheet mobile pour ajouter un créneau : slide depuis le bas, `--ease-drawer`.
- Ne s'anime JAMAIS : nav, footer, éléments vus en boucle, focus clavier.
- Toujours : `prefers-reduced-motion`, transform/opacity only, rendu visible sans JS.
- Implémentation : skill `/motion` en fin de build (pas au jour 1).

## 9. Inventaire composants

Section vivante — chaque composant signature s'y ajoute + sa démo sur `/styleguide`.

| Composant | Variantes                                                                                | Styleguide |
| --------- | ---------------------------------------------------------------------------------------- | ---------- |
| Button    | primary (marine) · secondary (teal) · ghost · danger · états hover/active/focus/disabled | à créer    |

**Style bouton « glossy »** (inspiré des boutons d'animations.dev, couleurs ACGB conservées) : les variantes colorées (`primary`, `secondary`, `danger`) utilisent une skin réutilisable `.skin-glossy` + `.skin-{variant}` (cf. `src/routes/layout.css`) :

- **Dégradé vertical** `linear-gradient(top → base)` — stop haut éclairci par variante (`--btn-*-top` dans `tokens.css`), base = couleur de marque.
- **Box-shadow 4 couches** : sheen blanc interne + hairline sombre + ombre douce + anneau 1px de la couleur du bouton (`--btn-*-ring`).
- **Hover** : `filter: brightness(1.07)` · **active** : `brightness(0.96)` (+ `scale(.98)` sur le gros bouton) · **disabled** : `filter: none`.
- `ghost` reste plat (transparent, hover `bg-surface-muted`). Skin découplée de la taille.
- **Tailles** (prop `size`) : `md` (défaut) `rounded-lg`/44px · `sm` `rounded`/32px (≈ `buy-button-small`). Les boutons compacts en ligne (`min-h-9`/36px) gardent leur classe inline.
  | StatusBadge | disponible (teal) · peut-être (ambre) · complet (rouge) | à créer |
  | ShiftCard (créneau) | places restantes, capacité, statut, action d'inscription | à créer |
  | PositionGroup (poste) | en-tête couleur auto + liste de créneaux | à créer |
  | EmptyState | générique | à créer |
  | Modal | backdrop + panneau centré · `bind:open` · Échap/clic backdrop pour fermer · scroll lock | à créer |

> `/styleguide` (page live noindex) à créer pendant l'Epic 1, une fois SvelteKit scaffold.
