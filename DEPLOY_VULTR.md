# Deploying Wanderlust on Vultr

The app is a static site: Vultr runs nginx, which serves the built files and forwards SerpAPI
requests (SerpAPI blocks direct browser calls). A free `sslip.io` address gives it HTTPS, which
phones require before they allow the camera and microphone.

Takes about 10 minutes. Cost: the smallest Shared CPU plan with 2 GB RAM is enough.

## 1. Save the startup script

Vultr → **Orchestration → Startup Scripts → Add Startup Script**
- Name: `wanderlust`, Type: **Boot**
- Paste the script below. Put your keys between the quotes at the top. Leave a key empty to use
  the app's built-in demo data for that feature (empty Gemini = demo identification).

```bash
#!/bin/bash
GEMINI_KEY=""
SERPAPI_KEY=""
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

git clone -b "$BRANCH" "$REPO" /opt/wanderlust
cd /opt/wanderlust
cp .env.example .env
[ -n "$GEMINI_KEY" ] && sed -i "s|^VITE_GEMINI_API_KEY=.*|VITE_GEMINI_API_KEY=$GEMINI_KEY|" .env
[ -n "$SERPAPI_KEY" ] && sed -i "s|^VITE_SERPAPI_API_KEY=.*|VITE_SERPAPI_API_KEY=$SERPAPI_KEY|" .env
npm ci
npm run build

# The sslip.io name for this server, e.g. 66.42.84.210 -> 66-42-84-210.sslip.io
IP=$(hostname -I | awk '{print $1}')
DOMAIN="${IP//./-}.sslip.io"

# server_name must be the real domain, or certbot cannot install the certificate.
cat > /etc/nginx/sites-available/default <<EOF
server {
  listen 80 default_server;
  server_name $DOMAIN;
  root /opt/wanderlust/dist;
  location / { try_files \$uri /index.html; }
  location /proxy/serpapi/ { proxy_pass https://serpapi.com/; proxy_ssl_server_name on; }
}
EOF
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
cd /opt/wanderlust && git pull && npm run build
```

Run the same after editing keys (`nano /opt/wanderlust/.env`) — keys are built into the site.

## Troubleshooting

Log in with `ssh root@<your-ip>` (password: the server's Overview page in Vultr; nothing shows
while you type it), then:

```bash
cloud-init status          # "running" = still setting up, "done" = finished
tail -30 /root/setup.log   # what the script did and where it stopped
cat /root/wanderlust-url.txt
```

**"Could not automatically find a matching server block"** (servers made with the earlier script,
which used `server_name _;`):

```bash
sed -i 's/server_name _;/server_name YOUR-IP-WITH-DASHES.sslip.io;/' /etc/nginx/sites-available/default
nginx -t && systemctl reload nginx
certbot --nginx -d YOUR-IP-WITH-DASHES.sslip.io --reinstall --redirect --non-interactive --agree-tos --register-unsafely-without-email
```

**"Site can't be reached"** — the script is still running, it stopped early (see the log), or a
firewall group without rules is linked to the server.

## Notes

- `VITE_` keys end up inside the website and anyone can read them. Set spending limits on the
  Gemini and SerpAPI keys.
- Without `VITE_API_BASE_URL`, accounts and posts are saved in each visitor's browser only.
- Hackathon credit expires; delete the server afterwards (**Compute → Instances → Destroy**) so
  nothing is billed to the card on file.
