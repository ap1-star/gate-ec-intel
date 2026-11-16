# Host your GATE EC terminal

Use **GitHub → Railway** for the complete website, accounts, persistent saved data and background recruitment checks. Netlify and Vercel can host the frontend and connect to that Railway backend. The separate Netlify Drop archive is the quickest public-only option.

This guide applies to the portable hosting archives. The older Sites handoff files describe the original hosted service; its ChatGPT sign-in, identities, database, secrets and cloud automation are not transferred in these files. Your new host starts with its own database and website accounts. The research corpus and source registry are included.

| File / destination | What runs there |
| --- | --- |
| `GATE_EC_HOSTING_SOURCE.zip` → GitHub → Railway | Complete Node app, SQL storage, account service and background runner, after the volume and variables below are configured |
| Same source → Netlify or Vercel | Frontend plus proxy to your Railway backend; without `BACKEND_ORIGIN`, public snapshot browsing only |
| `GATE_EC_NETLIFY_DROP.zip` → Netlify Drop | Prebuilt public research and career snapshot; no account database or automatic recruitment updates |
| GitHub repository | Stores the source for import into your host. GitHub Pages can serve static files but does not run this Node backend. |

## Recommended: deploy the full app on Railway

1. Extract `GATE_EC_HOSTING_SOURCE.zip`. Upload the extracted contents to a new GitHub repository. **`package.json`, `Dockerfile` and `railway.toml` must be at the repository root**, rather than inside another enclosing folder. Do not upload `node_modules`, real `.env` files, databases or credentials.
2. In Railway, create a project from that GitHub repository. The included Dockerfile uses Node 24 and builds the application. Keep **one replica** for this SQLite deployment.
3. Attach a persistent volume to this service and mount it at **`/data`**. Set `SQLITE_PATH=/data/workspace.sqlite`. The database and saved accounts must use this volume so they survive redeploys. Railway documents volumes as persistent service storage. [Railway volumes](https://docs.railway.com/volumes/reference)
4. Generate a public HTTPS domain for the service. Set the following service variables, then deploy/redeploy:

   | Variable | Value |
   | --- | --- |
   | `PUBLIC_ORIGIN` | Your exact HTTPS website origin, for example `https://your-terminal.up.railway.app`; no path or trailing slash |
   | `SESSION_SECRET` | A newly generated, persistent random secret, at least 48 characters |
   | `SQLITE_PATH` | `/data/workspace.sqlite` |
   | `RUN_SCHEDULER` | `true` |

   Generate the session secret on your own computer with:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
   ```

   Paste that result into Railway's variable field. Keep it private and preserve it across redeploys. It is not a password to give website visitors.

5. Open your HTTPS website. Public research works without signing in. Use the website's account form to register your own account. The portable version uses its own secure website login; it does not reuse the original ChatGPT login.
6. To grant your own registered account owner access, run this in the Railway service shell:

   ```sh
   npm run owner:lookup -- yourusername
   ```

   Copy the returned user UUID into the Railway variable `OWNER_USER_ID` and redeploy. The first visitor or first registered username is never automatically made the owner. Leave this variable blank until you identify your account.
7. Verify that sign-in works and a saved preference remains after sign-out/sign-in. Check the service logs for successful runner phases. Keep the service running and configure database backups before relying on saved user data.

The service listens on Railway's `PORT` and `0.0.0.0`. The included configuration starts it with `npm start`; a separate development preview command is not needed for production. Railway supports persistent services for web apps and APIs. [Railway build and deployment](https://docs.railway.com/build-deploy)

Credential attempts are limited per normalized account (20 per 15 minutes), with service-wide registration (50 per 15 minutes) and total authentication (300 per 15 minutes) ceilings. Invalid and malformed attempts count. These in-process limits reset after restart; distinct accounts sharing a hosting proxy have separate account buckets. Forwarding headers do not establish a visitor's identity.

## Optional: put the frontend on Netlify or Vercel

First deploy the Railway backend above. Then import the same GitHub repository into Netlify or Vercel using the supplied platform configuration.

1. Use build command **`npm run build`** and publish/output directory **`public`**. Keep the included `netlify.toml` or `vercel.json` in the repository root.
2. In the frontend host's environment variables, set:

   ```text
   BACKEND_ORIGIN=https://your-railway-backend.up.railway.app
   ```

   This is the backend's HTTPS origin only, without a path, query, credentials or trailing slash.
3. In Railway, change **`PUBLIC_ORIGIN` to the final frontend HTTPS origin**, for example `https://your-terminal.netlify.app` or `https://your-terminal.vercel.app`, and redeploy the backend. Keep `BACKEND_ORIGIN` pointing to Railway on the frontend host.
4. Redeploy the frontend. Use that one canonical frontend URL for sign-in and verification links. The supplied proxy forwards account/recruitment requests to Railway while the frontend serves the interface. Vercel supports proxying to an external origin through its routing system. [Vercel rewrites](https://vercel.com/docs/routing/rewrites)

With `BACKEND_ORIGIN` unset, the frontend deliberately offers public snapshot data with private services unavailable. Adding a frontend host alone does not create a persistent SQL database, import existing users or start a background runner. Persistent data and recruitment jobs remain on Railway; do not run SQLite from a serverless temporary directory.

## Quick public-only upload: Netlify Drop

1. Use **`GATE_EC_NETLIFY_DROP.zip`**, not the source archive.
2. Open [Netlify Drop](https://app.netlify.com/drop) and upload the ZIP, or extract it and drop the folder containing `index.html`.
3. Open the URL Netlify gives you. No build command is needed for this prebuilt archive. Netlify Drop accepts a project folder or ZIP. [Official quickstart](https://docs.netlify.com/start/quickstarts/netlify-drop-quickstart/)

This option serves public research, predictors and the bundled career reference snapshot. Accounts, saved private records, live source monitoring and external alerts need the backend deployment. To connect a backend, use the Git-based Netlify deployment described above.

For **GitHub Pages**, extract the same Drop ZIP and commit its contents at the publishing root. Keep the included `.nojekyll` file so GitHub serves the `_hosting` snapshot directory. Enable Pages for that branch/folder in repository settings. The archive supports a repository subdirectory URL; Pages still provides only the public edition.

## Alerts and background checks

`RUN_SCHEDULER=true` enables the durable recruitment runner inside the running Node service. Its default phase interval is one minute, with four phases per cycle. It runs independently of a visitor keeping a browser open. Keep one instance of this SQLite service; use the stored source and queue outcomes to verify operation.

Email, web push, WhatsApp and SMS each need their corresponding provider/key configuration and explicit recipient consent. Sender/domain verification and applicable approved templates are separate setup steps. The included code does not carry your original host's secrets, senders, browser subscriptions or delivery permissions. No external channel is silently enabled by deploying the ZIP.

Recruitment source access and eligibility remain evidence-based: an organization directory entry does not establish a live vacancy, and unreviewed discoveries stay out of the public notice feed until approved.

## Local source check

Install Node 24, then from the extracted project root run:

```sh
npm ci
npm run build
```

Production starts with `npm start` after its required environment variables and persistent storage are configured. Do not commit the generated session secret or a real user database to GitHub.

## If something is missing

- **Research loads but accounts are unavailable:** confirm you deployed the source app on Railway, or configured `BACKEND_ORIGIN` on your frontend host.
- **Cookies/sign-in fail:** check the canonical HTTPS `PUBLIC_ORIGIN`; use the same final frontend domain consistently.
- **Data disappears after redeploy:** confirm `/data` is an attached persistent volume and `SQLITE_PATH` points inside it.
- **Owner review is denied:** register normally, look up your exact UUID and set `OWNER_USER_ID`; a username alone does not grant ownership.
- **No alert arrives:** check provider configuration, recipient verification, explicit consent and actual queue/source logs. A saved preference or provider submission is not proof of delivery.
