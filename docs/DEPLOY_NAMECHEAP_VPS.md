# Deploying to a Namecheap VPS

**Not the active path right now** — the client bought shared hosting, not
VPS, so `docs/DEPLOY_NAMECHEAP_SHARED_HOSTING.md` is what's actually in use.
Keeping this here in case that changes later; everything below assumes a
VPS with root access that this account doesn't have today.

Target: `msafirispace.com`, Docker-based deploy using `docker-compose.prod.yml`.

## 1. Buy the VPS

Namecheap dashboard → Hosting List → VPS → pick a plan. **Pulsar** (2 CPU,
2GB RAM, 40GB SSD, ~$6.88/mo intro) is the realistic minimum for running
Postgres + Redis + Django + nginx on one box together. Spark's 1GB RAM is
too tight once Postgres and Redis are both resident.

During setup:
- **OS**: Ubuntu 22.04 LTS (or 24.04 if offered).
- **Management**: "User Responsible" is fine — you have a working deploy
  script, you don't need Namecheap's paid managed tier.
- Namecheap emails you the server's **public IP** and root password (or lets
  you upload an SSH key — prefer that if offered).

## 2. Point the domain at it

In the Namecheap dashboard: Domain List → `msafirispace.com` → **Manage** →
**Advanced DNS** → add:

| Type | Host | Value | TTL |
|---|---|---|---|
| A Record | `@` | *(VPS public IP)* | Automatic |
| A Record | `www` | *(VPS public IP)* | Automatic |

DNS propagation can take a few minutes to a few hours. Check with
`dig msafirispace.com +short` — once it prints the VPS's IP, move on.

## 3. First login and basic hardening

```bash
ssh root@<VPS_IP>

# Create a non-root user, don't deploy as root
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy   # if you used SSH keys

# Firewall: only SSH, HTTP, HTTPS
apt update && apt install -y ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

su - deploy
```

From here on, run everything as `deploy`, not `root`.

## 4. Install Docker

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker   # or log out/in
docker --version
docker compose version
```

## 5. Get the code onto the server

```bash
git clone https://github.com/ShipItCaptain/msafirispace.git
cd msafirispace
```

(Set up a deploy key or use an HTTPS token if the repo is private — GitHub's
docs cover this; the VPS just needs read access to clone/pull.)

## 6. Create the production secrets file

```bash
cp .env.production.example .env.production
nano .env.production   # fill in real values
```

Fill in at minimum: `SECRET_KEY` (generate with the command in the file's
comments), `POSTGRES_PASSWORD` (pick something real), `EMAIL_HOST_USER` /
`EMAIL_HOST_PASSWORD` (the Gmail SMTP creds already proven working, d6-2).
Leave the Paystack/M-Pesa/Cloudinary blocks blank until you have those —
the app runs fine without them, those features just won't work yet.

**Never commit this file.** It's already in `.gitignore`.

## 7. Bootstrap the first TLS certificate

This has to happen *before* the first `docker compose up`, because nginx's
config requires a real certificate to exist just to start — chicken-and-egg.
Certbot's `--standalone` mode solves it by binding port 80 itself, once,
before anything else is running:

```bash
sudo apt install -y certbot
sudo certbot certonly --standalone \
  -d msafirispace.com -d www.msafirispace.com \
  --email you@example.com --agree-tos --no-eff-email
```

This writes certs to `/etc/letsencrypt/live/msafirispace.com/` — exactly
where `docker-compose.prod.yml` mounts them into the nginx container.

## 8. First deploy

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps   # all should be "Up"
docker compose -f docker-compose.prod.yml logs backend --tail 50
```

The backend's `entrypoint.sh` runs migrations and `collectstatic`
automatically on container start (see Day 3 — this is why there's no
separate migrate step here).

Visit `https://msafirispace.com` — should load the real site over HTTPS.

## 9. Set up cert renewal

Let's Encrypt certs expire every 90 days. Renewal uses the `--webroot`
method against the already-running nginx (no downtime, unlike the
`--standalone` bootstrap step):

```bash
sudo certbot certonly --webroot -w /var/www/certbot \
  -d msafirispace.com -d www.msafirispace.com \
  --email you@example.com --agree-tos --no-eff-email --dry-run   # test first

# If the dry run succeeds, set up auto-renewal:
sudo crontab -e
# add this line:
0 3 * * * certbot renew --webroot -w /var/www/certbot --quiet --post-hook "docker compose -f /home/deploy/msafirispace/docker-compose.prod.yml restart nginx"
```

## 10. Ongoing deploys

```bash
cd msafirispace
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

This rebuilds and restarts only what changed. Postgres/Redis data persists
in named volumes across restarts.

## What this doesn't cover yet

- **Managed backups** (d7-4) — Postgres data is on the VPS's own disk; a VPS
  failure loses it unless you set up `pg_dump` + offsite storage separately.
- **Sentry** (d7-2) — no error tracking configured yet.
- **M-Pesa / Paystack / Cloudinary production keys** — the app runs without
  them, those specific features just stay inert until the keys are added to
  `.env.production` and the backend container is restarted.
