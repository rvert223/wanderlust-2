# Deploying Wanderlust on Vultr

Vultr runs two things: nginx, which serves the built website, and a small Node API server
(`server/index.js`) that bridges the app to SerpAPI Google Lens and Meta's Muse models (Muse Spark
and Muse Voice Transcribe, through the Meta Model API). Lens only accepts an image URL, so the
server hosts each photo for the length of one lookup, then deletes it. All keys live only on the
server. A free `sslip.io` address gives the site HTTPS, which phones require before
they allow the camera and microphone (and which Google Lens needs to fetch the photo).

Takes about 10 minutes. The smallest Shared CPU plan with 2 GB RAM is enough.

> Already have a server running from the earlier version of this guide? Skip to
> [Upgrading an existing server](#upgrading-an-existing-server).

## 1. Save the startup script

Vultr → **Orchestration → Startup Scripts → Add Startup Script**
- Name: `wanderlust`, Type: **Boot**
- Paste the script below and fill in the values at the top. Leave any of them empty to use the
  app's built-in demo data for that feature.

```bash
#!/bin/bash
SERPAPI_KEY=""        # Google Lens visual search (kept on the server only)
MUSE_KEY=""           # Meta Model API key: Muse Spark + Voice Transcribe (kept on the server only)
BRANCH="claude/tender-hopper-8bb32z"
REPO="https://github.com/rvert223/wanderlust-2.git"

exec > /root/setup.log 2>&1
set -e
export DEBIAN_FRONTEND=noninteractive

# A fresh Ubuntu server runs automatic updates on first boot; wait for them to release apt.
while fuser /var/lib/dpkg/lock-frontend /var/lib/apt/lists/lock >/dev/null 2>&1; do echo "waiting for apt..."; sleep 5; done

apt-get update
apt-get install -y nginx git certbot python3-certbot-nginx curl psmisc
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
ufw allow 'Nginx Full' || true
ufw allow OpenSSH || true

# The sslip.io name for this server, e.g. 66.42.84.210 -> 66-42-84-210.sslip.io
IP=$(hostname -I | awk '{print $1}')
DOMAIN="${IP//./-}.sslip.io"

git clone -b "$BRANCH" "$REPO" /opt/wanderlust
cd /opt/wanderlust

# Website settings (built into the site — never put API keys here)
cp .env.example .env
npm ci
npm run build

# API server settings (private — this is where the keys live)
cat > server/.env <<ENVFILE
SERPAPI_API_KEY=$SERPAPI_KEY
PUBLIC_BASE_URL=https://$DOMAIN
PORT=8787
MUSE_API_KEY=$MUSE_KEY
ENVFILE
chmod 600 server/.env
mkdir -p server/uploads && chown www-data:www-data server/uploads
cp server/wanderlust-api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now wanderlust-api

# nginx: the website, plus /api/ to the API server. server_name must be the real domain,
# or certbot cannot install the certificate.
cat > /etc/nginx/sites-available/default <<NGINX
server {
  listen 80 default_server;
  server_name $DOMAIN;
  root /opt/wanderlust/dist;
  client_max_body_size 8m;
  location / { try_files \$uri /index.html; }
  location /api/ {
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_read_timeout 60s;
  }
}
NGINX
nginx -t
systemctl reload nginx

certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect \
  && echo "https://$DOMAIN" > /root/wanderlust-url.txt \
  || echo "http://$IP (HTTPS failed, see /root/setup.log)" > /root/wanderlust-url.txt
```

## 2. (Optional) Firewall group

Vultr → **Network → Firewall Groups → Add Firewall Group**, then add three rules:

| Protocol | Port | Source |
| --- | --- | --- |
| TCP | 22 | Anywhere |
| TCP | 80 | Anywhere |
| TCP | 443 | Anywhere |

Only link the group to the server once all three rules are in it — a linked group with no rules
blocks everything. Skipping the group is fine; the script opens the ports on the server itself.

## 3. Create the server

Vultr → **Compute → Instances → Deploy**
- Type **Shared CPU**, any US location, a plan with **2 GB RAM or more**
- Operating system: **Ubuntu 24.04 LTS x64**
- Startup Script: `wanderlust` (or tick **Cloud-Init User Data** and paste the script there instead — not both)
- Instance Connectivity: **Instance(s) with Public IP**, **Public IPv4** ticked
- Leave DDoS Protection off and **Limited User Login unticked**
- **Deploy**

If Vultr says "Please fund your account", add credit under **Billing** (hackathon promo codes go
there too) and keep a card on file.

## 4. Open the app

Wait 5–8 minutes after the server shows **Running**, then open
`https://<your-ip-with-dashes>.sslip.io` — for example `https://66-42-84-210.sslip.io`.

Use dashes, not dots: the certificate is issued for the dashed name.

## Updating after new code is pushed

```bash
ssh root@<your-ip>
cd /opt/wanderlust && git pull && npm ci && npm run build && systemctl restart wanderlust-api
```

- Website settings (`nano /opt/wanderlust/.env`, the `VITE_…` lines) are built into the site, so
  run the update line after editing them.
- Server settings (`nano /opt/wanderlust/server/.env`, the SerpAPI and Muse keys) only need
  `systemctl restart wanderlust-api`.

## Adding the Muse key to a running server

```bash
cd /opt/wanderlust && git pull && npm ci && npm run build
grep -q '^MUSE_API_KEY=' server/.env || echo 'MUSE_API_KEY=' >> server/.env
nano server/.env
```

Put your Meta Model API key after `MUSE_API_KEY=`, save (**Ctrl+O**, **Enter**, **Ctrl+X**), then:

```bash
systemctl restart wanderlust-api
sleep 2 && curl -s http://127.0.0.1:8787/api/muse/test
```

`{"ok":true,"model":"muse-spark-1.3","reply":"ready"}` means Muse is connected. If it prints an
error instead, `journalctl -u wanderlust-api -n 20 --no-pager` shows Meta's exact answer.

## Upgrading an existing server

For a server set up with the earlier version of this guide (website only, no API server). Log in
with `ssh root@<your-ip>` and run these one block at a time.

**1. Get the new code and build it:**

```bash
cd /opt/wanderlust && git pull && npm ci && npm run build
```

**2. Create the API server's settings file:**

```bash
cp server/.env.example server/.env && nano server/.env
```

Put your SerpAPI key after `SERPAPI_API_KEY=` and your site address after `PUBLIC_BASE_URL=`
(for example `https://66-42-84-210.sslip.io`). Save with **Ctrl+O**, **Enter**, **Ctrl+X**.

**3. Start the API server:**

```bash
chmod 600 server/.env
mkdir -p server/uploads && chown www-data:www-data server/uploads
cp server/wanderlust-api.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now wanderlust-api
curl -s http://127.0.0.1:8787/api/health
```

The last line should print `{"ok":true,"lensConfigured":true}`.

**4. Route `/api/` through nginx.** This rewrites the whole nginx settings file, keeping the HTTPS
certificate certbot already issued. Set your address on the first line, then paste the whole block:

```bash
DOMAIN="66-42-84-210.sslip.io"   # your IP with dashes + .sslip.io
cp /etc/nginx/sites-available/default /root/nginx-default.backup
ls /etc/letsencrypt/live/$DOMAIN/fullchain.pem /etc/letsencrypt/options-ssl-nginx.conf /etc/letsencrypt/ssl-dhparams.pem && \
cat > /etc/nginx/sites-available/default <<NGINX
server {
  listen 443 ssl;
  server_name $DOMAIN;
  ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
  include /etc/letsencrypt/options-ssl-nginx.conf;
  ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

  root /opt/wanderlust/dist;
  client_max_body_size 8m;
  location / { try_files \$uri /index.html; }
  location /api/ {
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_read_timeout 60s;
  }
}

server {
  listen 80 default_server;
  server_name $DOMAIN;
  return 301 https://\$host\$request_uri;
}
NGINX
nginx -t && systemctl reload nginx
```

If `ls` reports a missing file, stop: the certificate isn't there yet (see "Could not automatically
find a matching server block" under Troubleshooting). If anything goes wrong,
`cp /root/nginx-default.backup /etc/nginx/sites-available/default && systemctl reload nginx` restores
the old settings.

**5. Check it from the outside** (this goes through nginx, the way phones do — a check on
`127.0.0.1` skips nginx and can pass even when phones can't get through):

```bash
curl -s https://$DOMAIN/api/health
```

`{"ok":true,"lensConfigured":true,…}` means scans now use Google Lens. Any old
`VITE_SERPAPI_API_KEY` / `VITE_GEMINI_API_KEY` lines in `/opt/wanderlust/.env` are no longer used
and can be deleted.

## Demo scan mode (always poison hemlock)

For presenting while Google Lens is unavailable: every scan returns poison hemlock without calling
SerpAPI. Muse still writes the identification, hazard level and spoken warning. Applies to everyone
using the site; no rebuild needed.

```bash
# turn on
cd /opt/wanderlust && sed -i '/^DEMO_SCAN=/d' server/.env && echo "DEMO_SCAN=poison-hemlock" >> server/.env && systemctl restart wanderlust-api
# turn off (scan for real again)
cd /opt/wanderlust && sed -i '/^DEMO_SCAN=/d' server/.env && systemctl restart wanderlust-api
```

`curl -s http://127.0.0.1:8787/api/health` shows `"demoScan":"poison-hemlock"` while it is on.

## When Meta blocks the server: relay Muse through a laptop

Meta's Model API answers normal internet connections but, at the time of writing, **not cloud
servers**: from Vultr (Atlanta and Chicago, IPv4 and IPv6) a working key gets
`GET /v1/models` → `{"data":[]}` and every model → `404 model_not_found`, while the same key from a
laptop lists every model. Check it on the server:

```bash
K=$(grep '^MUSE_API_KEY=' /opt/wanderlust/server/.env | cut -d= -f2-)
curl -s https://api.meta.ai/v1/models -H "Authorization: Bearer $K" | head -c 200; echo
```

If that list is empty but the same key lists models from a laptop (Mac Terminal:
`curl -s https://api.meta.ai/v1/models -H "Authorization: Bearer YOUR_KEY"`; Windows PowerShell:
use `curl.exe`, not `curl`), first ask the Meta team to allow server use. For a demo in the
meantime, send the server's Muse requests through that laptop with a free Cloudflare tunnel. Ask
the Meta team whether relaying is acceptable before relying on it.

**1. On the laptop, install `cloudflared`.**
- Mac (Intel): `cd ~ && curl -L -o cloudflared.tgz https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz && tar -xzf cloudflared.tgz && chmod +x cloudflared`
- Mac (Apple silicon): the same with `cloudflared-darwin-arm64.tgz`
- Windows: `winget install Cloudflare.cloudflared`

**2. Start the tunnel and leave the window open:**

```bash
~/cloudflared tunnel --url https://api.meta.ai --http-host-header api.meta.ai --origin-server-name api.meta.ai
```

(Windows: `cloudflared tunnel …` with the same options.) Scroll up in its output to the box
"Your quick Tunnel has been created!" and copy the `https://….trycloudflare.com` link.

**3. On the server, point Muse at the tunnel** (put your link on the first line):

```bash
LINK="https://random-words.trycloudflare.com"
cd /opt/wanderlust && sed -i '/^MUSE_BASE_URL=/d' server/.env && echo "MUSE_BASE_URL=$LINK/v1" >> server/.env && systemctl restart wanderlust-api && sleep 3 && curl -s http://127.0.0.1:8787/api/muse/test; echo
```

`{"ok":true,"model":"muse-spark-1.3","reply":"ready"}` means Muse is live through the laptop. A new
tunnel link can take a minute to start working.

- Keep the laptop awake, plugged in and online with the tunnel window open; if it stops, scans fall
  back to the cautious "unconfirmed" identification.
- Restarting `cloudflared` gives a new link: repeat step 3 with it.
- To call Meta directly again (once the server is allowed):
  `sed -i '/^MUSE_BASE_URL=/d' /opt/wanderlust/server/.env && systemctl restart wanderlust-api`

## Troubleshooting

Log in with `ssh root@<your-ip>` (password: the server's Overview page in Vultr; nothing shows
while you type it), then:

```bash
cloud-init status                     # "running" = still setting up, "done" = finished
tail -30 /root/setup.log              # what the script did and where it stopped
cat /root/wanderlust-url.txt
systemctl status wanderlust-api       # is the API server running?
journalctl -u wanderlust-api -n 30    # its recent log (Lens errors show up here)
curl -s http://127.0.0.1:8787/api/health
```

**Scans always show the same few demo species** (Destroying Angel, Poison Hemlock, Castor Bean
Plant, Jimsonweed, Texas Coral Snake) — the scan isn't reaching Lens or Muse. See what phones'
requests got:

```bash
grep -E "api/serp/lens|api/muse/scan" /var/log/nginx/access.log | tail -4 | awk '{print $7, $9}'
```

- **`405`** — nginx has no `/api/` route, so it refuses the upload. Do step 4 of "Upgrading an
  existing server".
- **`502`** — the API server answered with an error; `journalctl -u wanderlust-api -n 30 --no-pager`
  shows SerpAPI's or Meta's message.
- **`429`** — the per-minute scan limit; wait a minute.
- **No lines at all** — the phone is showing an old copy of the site; close the tab and reopen it.

Also check that `https://<your-site>/api/health` says `"lensConfigured":true`, and that
`PUBLIC_BASE_URL` in `server/.env` is the site's `https://…sslip.io` address (Google downloads the
photo from there), then `systemctl restart wanderlust-api`.

**`/api/muse/test` says `Muse answered 404`** — Meta doesn't recognise the model for this request.
Run `journalctl -u wanderlust-api -n 60 --no-pager | grep "\[muse\]"`: `model_not_found` with an
empty `/v1/models` list means Meta is blocking the server (see "When Meta blocks the server").
`Muse answered 401` means the key is wrong — re-copy it.

**`/api/muse/test` says `"reply":""`** — the server has old code from before Muse Spark's reasoning
allowance was raised (`grep -c MAX_TOKENS server/muse.js` prints `0`). Run
`cd /opt/wanderlust && git pull && systemctl restart wanderlust-api`.

**"Could not automatically find a matching server block"** (servers made with the first version of
the script, which used `server_name _;`):

```bash
sed -i 's/server_name _;/server_name YOUR-IP-WITH-DASHES.sslip.io;/' /etc/nginx/sites-available/default
nginx -t && systemctl reload nginx
certbot --nginx -d YOUR-IP-WITH-DASHES.sslip.io --reinstall --redirect --non-interactive --agree-tos --register-unsafely-without-email
```

**"Site can't be reached"** — the script is still running, it stopped early (see the log), or a
firewall group without rules is linked to the server.

## Notes

- The SerpAPI and Muse keys stay on the server; the website never sees them. `VITE_` values are
  built into the website, so never put a key there.
- Every scan costs one SerpAPI search and one Muse call. Per visitor per minute the server allows
  6 scans, 20 Muse calls and 10 voice transcriptions.
- Without `VITE_API_BASE_URL`, accounts and posts are saved in each visitor's browser only.
- Hackathon credit expires; delete the server afterwards (**Compute → Instances → Destroy**) so
  nothing is billed to the card on file.
