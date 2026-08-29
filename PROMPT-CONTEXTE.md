# Contexte complet — app-notification

Tu travailles sur une application Next.js 14 + Supabase qui sert de plateforme de notifications internes pour une entreprise. Le projet est situé à `C:\Dev\app-notification`. Le code est en anglais (noms de variables, fichiers), mais l'interface utilisateur est bilingue (français/anglais). L'utilisateur est francophone et non-technique — il préfère que tu exécutes directement plutôt que de guider pas à pas.

---

## Stack technique

- **Framework** : Next.js 14.2.15 (App Router, Server Components, Server Actions)
- **Base de données** : Supabase (PostgreSQL + Auth + Storage + RLS)
- **Styles** : Tailwind CSS avec `darkMode: "class"`, couleurs brand via CSS custom properties (`--brand-50` à `--brand-900`)
- **Validation** : Zod
- **Push** : Web Push API (`web-push` npm package) avec VAPID
- **i18n** : Système maison basé sur des dictionnaires (fr.ts / en.ts), cookie `locale`
- **PWA** : Service worker (`public/sw.js`), manifest, offline fallback
- **TypeScript** strict

---

## Rôles utilisateur

```typescript
type AppRole = "gerant" | "dev" | "caissiere";
```

- **dev** : administrateur complet, accès à `/admin/*`, peut tout gérer
- **gerant** (gérant/manager) : accès lecture au fil de notifications, reçoit les notifications
- **caissiere** : comme gérant + accès au formulaire checklist caisse (`/checklist`)

Le rôle est stocké dans `profiles.role` (enum PostgreSQL `app_role`). Le trigger `handle_new_user` crée automatiquement un profil avec le rôle par défaut lors de l'inscription.

---

## Architecture du projet

### Répertoires principaux

```
src/
├── app/                    # Routes Next.js (App Router)
│   ├── (auth)/             # Routes publiques : /login, /register
│   ├── (app)/              # Routes protégées (auth requise)
│   │   ├── layout.tsx      # Layout principal avec header, footer, bottom nav mobile
│   │   ├── feed/           # Fil de notifications (page principale pour gérants/caissières)
│   │   ├── checklist/      # Formulaire checklist caisse (caissière only)
│   │   ├── settings/       # Réglages (profil, apparence, push, langue, mutes)
│   │   ├── dashboard/      # Dashboard rappels (dev only)
│   │   ├── employees/      # Annuaire employés (dev only)
│   │   ├── reminders/      # Gestion des rappels (dev only)
│   │   └── admin/          # Administration (dev only)
│   │       ├── page.tsx         # Vue d'ensemble
│   │       ├── feed/            # CRUD notifications
│   │       ├── schedules/       # Planifications récurrentes
│   │       ├── templates/       # Modèles de notification
│   │       ├── categories/      # Catégories (tags)
│   │       ├── sessions/        # Périodes temporelles
│   │       ├── teams/           # Équipes (ciblage)
│   │       ├── users/           # Gestion des rôles
│   │       ├── checklists/      # Historique checklists caisse
│   │       ├── deliveries/      # Audit envois (email, SMS, push)
│   │       ├── analytics/       # Statistiques globales
│   │       ├── branding/        # Personnalisation nom/logo
│   │       └── aide/            # Pages d'aide
│   └── api/
│       ├── cron/                # Endpoints cron (run-schedules, send-reminders, keep-alive)
│       ├── push/                # subscribe (POST/DELETE), vapid-key (GET)
│       ├── export/              # CSV exports
│       └── health/              # Health check
│
├── domain/                 # Logique métier (chaque module = schema + repository + actions)
│   ├── auth/               # session.ts (getCurrentUser, requireUser), role.ts (getCurrentProfile, requireDev)
│   ├── feed/               # schema, repository, actions, dispatcher.ts (envois multi-canaux)
│   ├── checklists/         # items.ts (20 tâches), repository, actions
│   ├── users/              # repository, actions (setUserRoleAction)
│   ├── categories/         # schema, repository, actions
│   ├── sessions/           # schema, repository, actions
│   ├── teams/              # schema, repository, actions
│   ├── templates/          # schema, repository, actions
│   ├── notification-schedules/  # schema, repository, actions, worker.ts
│   ├── reminders/          # schema, repository, dispatcher.ts, actions
│   ├── employees/          # schema, repository, actions
│   ├── comments/           # schema, repository, actions
│   ├── category-mutes/     # repository, actions
│   ├── deliveries/         # repository
│   ├── analytics/          # repository
│   ├── branding/           # schema, repository, actions
│   ├── form-state.ts       # FormState<T> = {status:"idle"} | {status:"error",...} | {status:"success",...}
│   └── errors.ts
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts        # createClient() — client authentifié (cookies)
│   │   ├── admin.ts         # createAdminClient() — service role, bypass RLS
│   │   ├── middleware.ts    # updateSession() — refresh session + redirections
│   │   └── database.types.ts  # Types générés Supabase (toutes les tables)
│   ├── i18n/
│   │   ├── fr.ts            # Dictionnaire français (source de vérité pour le type Dictionary)
│   │   ├── en.ts            # Dictionnaire anglais (implémente Dictionary)
│   │   ├── server.ts        # getLocale(), getServerDictionary()
│   │   └── context.tsx      # useTranslation() hook (client)
│   ├── messaging/           # Système d'envoi multi-canaux
│   │   ├── types.ts         # ChannelId, Recipient, Message, NotificationChannel, etc.
│   │   ├── registry.ts      # ChannelRegistry singleton
│   │   ├── notify.ts        # notify() — dispatch + persistance
│   │   ├── persistence.ts   # persistDelivery() → table notification_deliveries
│   │   ├── index.ts         # Bootstrap (enregistre Email, SMS, Push channels)
│   │   ├── channels/
│   │   │   ├── email.ts     # EmailChannel (Resend ou mock)
│   │   │   ├── sms.ts       # SmsChannel (Twilio ou mock)
│   │   │   └── push.ts      # WebPushChannel (web-push lib)
│   │   └── providers/
│   │       ├── email/       # ResendEmailProvider, MockEmailProvider
│   │       └── sms/         # TwilioSmsProvider, MockSmsProvider
│   ├── env.ts               # publicEnv, serverEnv
│   ├── logger.ts            # JSON structured logging
│   ├── markdown.ts          # Parse markdown pour le corps des notifications
│   ├── variables.ts         # Substitution {name}, {email} dans les templates
│   └── csv.ts               # Export CSV
│
├── components/
│   ├── ui.tsx               # Button, LinkButton, Input, Textarea, Card, PageHeader, EmptyState, etc.
│   ├── feed-card.tsx        # Carte de notification dans le fil
│   ├── feed-engagement.tsx  # Réactions / lectures
│   ├── feed-comments.tsx    # Commentaires
│   ├── mobile-bottom-nav.tsx  # Barre de navigation mobile (icons, rôle-based tabs)
│   ├── push-toggle.tsx      # Toggle push dans settings
│   ├── push-auto-subscribe.tsx  # Auto-subscribe au premier chargement
│   ├── install-app.tsx      # Bannière PWA install
│   ├── language-toggle.tsx  # Switch FR/EN
│   ├── theme-provider.tsx   # Dark mode
│   ├── keyboard-shortcuts.tsx
│   ├── onboarding-modal.tsx
│   └── sw-register.tsx      # Enregistrement du service worker
│
└── middleware.ts            # Appelle updateSession()
```

---

## Patterns et conventions importants

### 1. Server Actions avec FormState

```typescript
// domain/form-state.ts
type FormState<T> =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> }
  | { status: "success"; message?: string; data?: T };

// Côté action :
export async function myAction(_prev: FormState, formData: FormData): Promise<FormState> { ... }

// Côté client :
const [state, formAction] = useFormState(myAction, { status: "idle" });
```

### 2. Supabase clients

- `createClient()` (de `server.ts`) : client authentifié via cookies, respecte RLS
- `createAdminClient()` (de `admin.ts`) : service role, bypass RLS — utilisé pour les opérations admin (changer le rôle d'un user, etc.)

**Important** : `createAdminClient()` doit être utilisé pour toute opération qui nécessite de contourner les policies RLS (ex: changer un rôle via `setUserRoleAction` car le trigger `guard_profile_role` bloque les changements de rôle sauf en service_role).

### 3. i18n

- **Server** : `const t = getServerDictionary();` puis `t.section.key`
- **Client** : `const t = useTranslation();` puis `t.section.key`
- Le type `Dictionary` est dérivé de `fr.ts` (source of truth). `en.ts` implémente `Dictionary`.
- La locale est stockée dans un cookie `locale` (default: `fr`).

### 4. Messaging multi-canaux

Le système est extensible via le pattern Registry :
- `NotificationChannel` interface : `id`, `displayName`, `isAvailable()`, `resolveRecipient()`, `send()`
- `ChannelRegistry` : singleton qui maintient une Map de channels
- `notify()` : itère les channels demandés, catch `ChannelSkip` (skip) vs `Error` (fail), persiste chaque résultat
- Channels actuels : email (Resend), sms (Twilio), push (Web Push)
- Pour ajouter WhatsApp : créer provider + channel + enregistrer dans `index.ts`

### 5. Contrôle d'accès

- **Middleware** (`middleware.ts`) : refresh session, redirige `/login` si non-auth sur routes protégées
- **Layout** (`(app)/layout.tsx`) : vérifie le rôle, redirige `/feed` si non-dev essaie d'accéder à `/admin/*`
- **Pages admin** : appellent `requireDev()` qui redirige si pas role `dev`
- **RLS** : chaque table a des policies PostgreSQL qui filtrent par rôle/user
- **Trigger `guard_profile_role`** : empêche les changements de rôle sauf en `service_role` ou si l'utilisateur est dev

### 6. Layout mobile

- Header simplifié sur mobile (nav links cachés `hidden md:contents`)
- `MobileBottomNav` : barre fixe en bas avec tabs basées sur le rôle
  - Notifications (bell) : tout le monde
  - Checklist (clipboard) : caissière only
  - Admin (grid) : dev only
  - Settings (cog) : tout le monde
- `pb-20 md:pb-8` sur le main pour le clearance de la bottom nav
- Safe area support via `env(safe-area-inset-bottom)`

---

## Base de données (19 migrations)

### Tables principales

| Table | Description |
|-------|-------------|
| `profiles` | Profil utilisateur (id=auth.users.id, role, first_name, last_name, phone, email) |
| `feed_items` | Notifications et rappels (kind, status, title, body, priority, target_mode, send_channels...) |
| `feed_item_reads` | Marquer comme lu (feed_item_id, user_id) |
| `feed_item_reactions` | Réactions emoji (feed_item_id, user_id, emoji) |
| `feed_item_comments` | Commentaires (feed_item_id, user_id, body) |
| `feed_item_target_teams` | Ciblage par équipe |
| `feed_item_target_users` | Ciblage par utilisateur |
| `categories` | Catégories de notifications (slug, name, color, icon) |
| `sessions` | Périodes temporelles (starts_at, ends_at, is_active, category_id) |
| `teams` | Équipes d'utilisateurs (slug, name, color) |
| `team_members` | Membres d'une équipe (team_id, user_id) |
| `notification_templates` | Modèles réutilisables |
| `notification_schedules` | Planifications récurrentes (times[], days_of_week[], timezone) |
| `schedule_target_teams/users` | Ciblage des planifications |
| `schedule_runs` | Historique des exécutions de planification |
| `notification_deliveries` | Audit complet des envois (channel, recipient, status, provider, error) |
| `employees` | Annuaire employés (pour les rappels legacy) |
| `reminders` | Rappels planifiés (employee_id, scheduled_at, status, attempts) |
| `push_subscriptions` | Abonnements Web Push (user_id, endpoint, p256dh, auth) |
| `cashier_checklists` | Checklists caisse (user_id, completed_items[], total_items, notes) |
| `category_mutes` | Catégories masquées par l'utilisateur |
| `app_settings` | Branding global (app_name, logo_url, tagline) |

### Fonctions PostgreSQL

- `is_dev()` : retourne true si `auth.uid()` a le rôle dev
- `compute_next_run(timezone, times[], days_of_week[])` : calcule la prochaine exécution d'une planification
- `claim_due_reminders(batch_size, max_attempts, stale_after_minutes)` : récupère les rappels à envoyer

### Trigger important

```sql
-- guard_profile_role : empêche les changements de rôle sauf service_role ou dev
CREATE OR REPLACE FUNCTION public.guard_profile_role()
RETURNS trigger LANGUAGE plpgsql AS $
BEGIN
  IF new.role IS DISTINCT FROM old.role
     AND auth.role() IS DISTINCT FROM 'service_role'
     AND NOT public.is_dev() THEN
    RAISE EXCEPTION 'role change not allowed';
  END IF;
  RETURN new;
END;
$;
```

C'est pour ça que `setUserRoleAction` utilise `createAdminClient()` (service role).

---

## Checklist caisse

20 tâches réparties en 3 sections (opening, during, closing) définies dans `domain/checklists/items.ts`. Seules les caissières y ont accès. À la soumission :
1. Insère dans `cashier_checklists`
2. Crée un `feed_item` notification visible par tous avec le nom de la caissière et le score
3. Limite : 1 soumission par jour par caissière

---

## Variables d'environnement requises

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cron
CRON_SECRET=

# Email (mock | resend)
EMAIL_PROVIDER=mock
EMAIL_FROM=
RESEND_API_KEY=

# SMS (mock | twilio)
SMS_PROVIDER=mock
SMS_FROM=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=

# Push
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:noreply@example.com
```

---

## Service Worker (public/sw.js)

- **Install** : cache la page `/offline`
- **Fetch** : network-first avec fallback offline pour les navigations
- **Push** : reçoit les events push, affiche une notification native avec vibration
- **Notification click** : focus la fenêtre existante ou ouvre `/feed`

---

## État actuel — migrations en attente

**L'utilisateur doit peut-être encore exécuter sur Supabase** :
- `0018_cashier_checklists.sql` — table checklists caisse + RLS
- `0019_rename_employee_to_gerant.sql` — `ALTER TYPE public.app_role RENAME VALUE 'employee' TO 'gerant'`

Si ces migrations n'ont pas été exécutées, les features correspondantes ne marcheront pas.

---

## Points d'attention / Gotchas

1. **`createClient()` vs `createAdminClient()`** : ne jamais utiliser `createAdminClient()` sauf quand on doit bypass RLS (changement de rôle, opérations cross-user). Utiliser `createClient()` par défaut.
2. **Le type Dictionary** : `fr.ts` est la source de vérité. `en.ts` doit implémenter exactement la même structure. Si tu ajoutes une clé i18n, ajoute-la dans les deux fichiers.
3. **Le trigger `guard_profile_role`** : bloque les changements de rôle. Les server actions qui modifient le rôle doivent utiliser `createAdminClient()`.
4. **Build** : toujours vérifier avec `npx next build` avant de livrer — le TypeScript strict catch beaucoup d'erreurs.
5. **Pas de git** : le repo n'a pas de remote git configuré. L'utilisateur travaille en local.
6. **Les routes `/dashboard`, `/employees`, `/reminders`** sont dev-only (contrôlé dans le layout via `DEV_ONLY_PREFIXES`).
7. **Le rôle "gerant" remplace "employee"** — le rename a été fait partout dans le code mais les migrations SQL doivent être exécutées côté Supabase.
