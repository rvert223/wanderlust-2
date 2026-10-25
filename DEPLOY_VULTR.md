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

**4. Route `/api/` through nginx.** Open the nginx settings (certbot's HTTPS lines in this file
stay as they are):

```bash
nano /etc/nginx/sites-available/default
```

Inside **each** `server { … }` block that contains `root /opt/wanderlust/dist;`, delete the
`location /proxy/serpapi/ { … }` line if it is there, and add:

```nginx
  client_max_body_size 8m;
  location /api/ {
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 60s;
  }
```

Save, then:

```bash
nginx -t && systemctl reload nginx
curl -s https://<your-ip-with-dashes>.sslip.io/api/health
```

If that prints `{"ok":true,"lensConfigured":true}`, scans now use Google Lens. Any old
`VITE_SERPAPI_API_KEY` / `VITE_GEMINI_API_KEY` lines in `/opt/wanderlust/.env` are no longer used
and can be deleted.

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

**Scans always show the same few demo species** — Lens isn't being reached. Check that
`/api/health` says `"lensConfigured":true`, and that `PUBLIC_BASE_URL` in `server/.env` is the
site's `https://…sslip.io` address (Google downloads the photo from there). Then
`systemctl restart wanderlust-api`.

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
