# CloudChat

CloudChat is a private, account-based chat application built with TanStack Start and React. It supports direct conversations, message self-chats, typing indicators, delivery/read state, message deletion, user search, and sign-in/sign-out.

MongoDB stores application data and Better Auth authentication data. There is no PostgreSQL/PGlite fallback.

## Prerequisites

- Node.js 22 or newer
- npm
- A MongoDB deployment (local MongoDB or MongoDB Atlas)
- A Better Auth secret for production

## MongoDB setup

Use a MongoDB connection string in `MONGODB_URI`, for example:

```text
mongodb://127.0.0.1:27017/cloudchat
```

For MongoDB Atlas, use the SRV connection string supplied by Atlas and allow the deployment host's IP address.

Application indexes are created automatically when MongoDB is first used. No SQL migrations are required.

## Environment variables

Set these variables in your shell or deployment environment:

| Variable | Required | Purpose |
|---|---:|---|
| `MONGODB_URI` | Yes for chat/auth persistence | MongoDB connection string |
| `MONGODB_DB_NAME` | No | Database name; defaults to `cloudchat` |
| `BETTER_AUTH_SECRET` | Production auth | Stable secret used to sign Better Auth state |
| `BETTER_AUTH_URL` | Production auth | Public origin of the app, e.g. `https://chat.example.com` |
| `GROK_AUTH_ISSUER` | Optional | Generic OAuth broker issuer |
| `GROK_AUTH_CLIENT_ID` | Optional | OAuth broker client ID |
| `GROK_AUTH_CLIENT_SECRET` | Optional | OAuth broker client secret |
| `VITE_AUTH_ENABLED` | No | Set to `false` only for auth-disabled local development |

Do not commit `.env` files or secrets. For Better Auth deployments, configure `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` as server environment variables.

## Local installation

```bash
npm install
```

Enable authentication and MongoDB by setting `MONGODB_URI` and removing `VITE_AUTH_ENABLED` from `.grok/app-env.json`, or set `VITE_AUTH_ENABLED=true` for your environment. Local email/password authentication is available through the existing login page.

Start the development server:

```bash
npm run dev
```

The app listens on `0.0.0.0:8080`.

## Validation

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Production build and preview

```bash
npm run build
npm run preview
```

## Authentication setup

CloudChat uses Better Auth at `/api/auth/*`. It can use local email/password sign-in or the configured Grok OAuth providers. MongoDB stores users, accounts, sessions, and verification records through the Better Auth MongoDB adapter.

For production:

1. Set `MONGODB_URI`.
2. Set a strong `BETTER_AUTH_SECRET`.
3. Set `BETTER_AUTH_URL` to the deployed HTTPS origin.
4. Configure `GROK_AUTH_*` variables if broker OAuth is used.
5. Enable auth in the app environment.

Protected chat operations verify the current Better Auth session server-side. Client-supplied user IDs are never used for authorization.

## Deployment

Deploy to Vercel or another Node-compatible platform. Configure `MONGODB_URI`, `MONGODB_DB_NAME` if needed, and authentication variables in the deployment environment. MongoDB network access must allow the deployment platform.

The existing Vite/TanStack, Nitro, PWA, and preview configuration is preserved. `vercel.json` needs no database-specific migration command.

## Troubleshooting

- **`MongoDB is not configured: set MONGODB_URI`**: add `MONGODB_URI` to the server environment.
- **MongoDB connection timeout**: verify the URI, credentials, DNS/network access, MongoDB Atlas IP allowlist, and replica-set configuration.
- **Unauthorized while accessing chats**: sign in again and verify `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` are stable across deployed instances.
- **Invalid origin**: set `BETTER_AUTH_URL` to the exact public origin and verify no accidental HTTP/HTTPS mismatch.
- **No chat conversations appear**: create a chat by searching for another signed-in user, or use the Message yourself option in the existing UI.
