# Deploy the full terminal on Render

Use the repository-root `render.yaml` Blueprint. It builds the existing Node 24 Dockerfile, runs one web service and mounts a 1 GB persistent disk at `/data`. Accounts, saved data and the recruitment runner use SQLite on this disk. Review Render's service and disk charges before applying the Blueprint; this full configuration requires a paid web service.

1. Open [Create Blueprint from this repository](https://dashboard.render.com/blueprint/new?repo=https://github.com/ap1-star/gate-ec-intel).
2. Connect GitHub and grant Render access to the private `ap1-star/gate-ec-intel` repository if prompted. Select the `main` branch and root `render.yaml`.
3. Review the service, region, compute plan and disk, then apply. The app uses Render's assigned `PORT` and `RENDER_EXTERNAL_URL` automatically. The Dockerfile handles the build and start command.
4. Open the assigned HTTPS URL. Check `/healthz`: `status` should be `ok`, `database` should be `true`, and `setupRequired` should be empty. Confirm sign-in and saved preferences work, and still exist after a restart.
5. To use your own domain or a separate frontend, set `PUBLIC_ORIGIN` to that exact HTTPS frontend origin and redeploy. Explicit `PUBLIC_ORIGIN` takes priority over Render's generated URL.

The session key is securely generated beside `/data/workspace.sqlite` on first startup and reused. Do not set a short placeholder secret. An optional persistent `SESSION_SECRET` must contain at least 48 characters. Neither the generated key nor real account databases belong in GitHub. The new host starts with its own accounts; an existing Sites/Railway database is not migrated by deploying this source.

After registering your account, use the Render service shell to run `npm run owner:lookup -- your-email@example.com`, then set the returned user UUID as `OWNER_USER_ID` in Render and redeploy. No visitor receives owner access automatically.

Keep one instance. The disk is attached to this service only; don't add a separate worker that expects to access the same SQLite file. Schema migrations and catalogue setup run at application startup, when the disk is mounted. They do not run in the image build or a pre-deploy command. Disk-backed redeploys can briefly interrupt availability. Set up SQLite-consistent backups before relying on production account data.

The built-in recruitment runner starts with the service. External email, WhatsApp, SMS and push delivery require provider configuration and consent as described in `HOSTING_GUIDE.md`. Admissions and placement data are bundled historical snapshots; recruitment monitoring does not refresh those imports.

For a free public-only edition, use the existing static hosting archive. Free static hosting does not supply persistent accounts or the background runner.

References: [Blueprint specification](https://render.com/docs/blueprint-spec), [persistent disks](https://render.com/docs/disks), [Render environment variables](https://render.com/docs/environment-variables).
