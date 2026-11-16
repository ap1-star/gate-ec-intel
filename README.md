# GATE EC Research Terminal — portable hosting edition

The complete Aurora interface, 520-question research corpus, difficulty analytics, PYQ tools, rank and admissions workspaces, and technical recruitment directory are included. Start with **[HOSTING_GUIDE.md](HOSTING_GUIDE.md)** for deployment steps.

| Destination | Setup |
| --- | --- |
| **Railway — recommended for the full app** | Import this repository. Attach a volume at `/data`; set `PUBLIC_ORIGIN`, `SESSION_SECRET`, `SQLITE_PATH=/data/workspace.sqlite` and `RUN_SCHEDULER=true`. Keep one replica. Dockerfile and Railway configuration are included. |
| **Netlify / Vercel** | Import this repository; build `npm run build`, output `public`. Set `BACKEND_ORIGIN` to the Railway backend and use the frontend domain as Railway's `PUBLIC_ORIGIN`. Without a backend, public snapshot browsing remains available. |
| **Netlify Drop / GitHub Pages** | Use the separate prebuilt `GATE_EC_NETLIFY_DROP.zip`. This public edition has no account database or background source checks. |

The independent deployment uses its own website accounts and SQLite database. Original hosted accounts, private data, secrets and cloud schedules do not transfer. External alerts require provider configuration and recipient consent.

## Develop and verify

Use **Node 24** and npm.

```sh
npm ci
npm run build
npm run verify
```

`npm start` runs the production Node server once the required environment variables are set. It serves `public/`, the account API and the background runner. `npm run dev` is a separate local development preview. Copy `.env.example` for reference; the production server reads environment variables supplied by your host.

Register normally, then use `npm run owner:lookup -- yourusername` in the hosted service shell to find the UUID for `OWNER_USER_ID`. Public registration never grants owner access automatically.

Edit `src/ui`, `src/app`, `src/features` and `src/domains`, then rebuild. The analytical engines and research data in `dist/` are required source assets; keep them in Git. `public/` is generated and can be rebuilt. Do not commit `.env`, session secrets, database files or `node_modules`.

The older integration and Sites handoff documents are retained as project history. Follow **HOSTING_GUIDE.md** and the portable runtime configuration for this export.