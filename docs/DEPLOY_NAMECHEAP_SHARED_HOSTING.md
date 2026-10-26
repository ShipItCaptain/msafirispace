# Deploying to Namecheap Shared Hosting

This is the active deployment path (the client already has shared hosting,
not VPS). `docs/DEPLOY_NAMECHEAP_VPS.md` and the Docker-based files
(`Dockerfile`s, `docker-compose.prod.yml`, `nginx/nginx.conf`) stay in the
repo as a documented path for later, but none of them apply here — shared
hosting has no root access and no Docker.

## Architecture

Shared hosting has no reverse proxy, so frontend and backend can't share one
domain the way the Docker/nginx setup did. Instead:

- **`msafirispace.com`** (root domain) — the React static build, served
  directly from `public_html`.
- **`api.msafirispace.com`** (subdomain) — the Django app, served via
  cPanel's Python App (Passenger/WSGI).
- **PostgreSQL** — via cPanel's own PostgreSQL Databases (confirmed
  available on Namecheap shared plans).
- **Cache** — Postgres-backed instead of Redis (Namecheap shared hosting
  doesn't offer Redis at all). Set `CACHE_BACKEND=database` — see
  `msafiri/settings.py`; verified locally to behave identically to Redis for
  both general caching and DRF rate-limit throttling (same shared-state
  correctness, just slower).
- **SSL** — cPanel's AutoSSL (free Let's Encrypt, automatic) on both the
  root domain and the subdomain. No manual certbot needed here, unlike the
  VPS path.

Because frontend and backend are now on different origins, API calls become
cross-origin — this only works because CORS is already configured for it
(see step 5).

## 1. Create the `api` subdomain

cPanel → **Domains** → **Create A New Domain** → subdomain `api`, domain
`msafirispace.com` → this gives you `api.msafirispace.com`.

## 2. Create the PostgreSQL database

cPanel → **Databases** → **PostgreSQL Databases**:
1. Create a database (e.g. `msafiri_space`).
2. Create a user with a real password (not the local dev one).
3. Add that user to the database with **ALL PRIVILEGES**.
4. Note the full details — cPanel usually prefixes both the DB name and
   username with your cPanel account name, e.g. `username_msafiri_space`.

## 3. Create the Python App

cPanel → **Software** → **Setup Python App** → **Create Application**:
- **Python version**: highest available 3.11.x (or closest to it).
- **Application root**: `msafiri_backend` (a directory outside `public_html`).
- **Application URL**: `api.msafirispace.com`.
- Leave startup file / entry point blank — cPanel generates
  `passenger_wsgi.py` for you; we'll overwrite it in step 5.

After creating it, cPanel shows a blue box with a command like:

```
source /home/<cpanel_user>/virtualenv/msafiri_backend/3.11/bin/activate && cd /home/<cpanel_user>/msafiri_backend
```

**Save this** — it's how you enter this app's virtualenv from the Terminal
every time.

## 4. Get the code onto the server

Open cPanel's **Terminal** (under Advanced), run the activation command from
step 3, then:

```bash
cd ~
git clone https://github.com/ShipItCaptain/msafirispace.git msafirispace_repo
cp -r msafirispace_repo/backend/* ~/msafiri_backend/
cp -r msafirispace_repo/backend/.* ~/msafiri_backend/ 2>/dev/null   # dotfiles, e.g. nothing sensitive yet
```

(If outbound git access is blocked on this account, use cPanel's **Git
Version Control** feature instead, or upload a zip of `backend/` via **File
Manager** and extract it into `msafiri_backend`.)

## 5. Configure `backend/.env` on the server

Inside `~/msafiri_backend`, create `.env` (same mechanism as local dev —
python-decouple reads it from the project root):

```bash
SECRET_KEY=<generate with: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())">

# Encrypts uploaded KYC documents (ID scans, permits, certificates) at rest.
# Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# Back this up separately from SECRET_KEY -- losing it makes already-uploaded
# documents permanently undecryptable.
FILE_ENCRYPTION_KEY=<generated Fernet key>

DEBUG=False
ALLOWED_HOSTS=api.msafirispace.com
CORS_ALLOWED_ORIGINS=https://msafirispace.com,https://www.msafirispace.com

DATABASE_URL=postgresql://<cpanel_db_user>:<password>@localhost:5432/<cpanel_db_name>

CACHE_BACKEND=database

SITE_URL=https://msafirispace.com

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST_USER=<gmail address, d6-2>
EMAIL_HOST_PASSWORD=<gmail app password>

# Blank is fine until these are actually set up -- the app runs without them.
PAYSTACK_PUBLIC_KEY=
PAYSTACK_SECRET_KEY=
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_PASSKEY=
MPESA_SHORTCODE=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
USE_CLOUDINARY_STORAGE=False
```

Note `ALLOWED_HOSTS` here is the **backend's own** domain
(`api.msafirispace.com`), not the frontend's — Django checks the Host
header of requests *to itself*.

## 6. Install dependencies and set up the database

Still inside the activated virtualenv, in `~/msafiri_backend`:

```bash
pip install -r requirements.txt
python manage.py migrate --noinput
python manage.py createcachetable
python manage.py collectstatic --noinput
```

## 7. Point `passenger_wsgi.py` at the real app

Edit `~/msafiri_backend/passenger_wsgi.py` (cPanel generated a stub here —
replace its contents entirely):

```python
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'msafiri.settings')

from msafiri.wsgi import application
```

Then, in cPanel → **Setup Python App**, click **Restart** on this
application.

## 8. Serve static/media files directly (bypass Passenger for them)

Passenger should only handle actual Django requests — static files are
faster served directly by Apache. In the subdomain's document root
(`~/api.msafirispace.com` or wherever cPanel put it, shown on the Domains
page), add an `.htaccess`:

```apache
RewriteEngine On
RewriteCond %{REQUEST_URI} ^/static/ [OR]
RewriteCond %{REQUEST_URI} ^/media/
RewriteRule ^ - [L]
```

...and symlink or copy `~/msafiri_backend/staticfiles` and the `media`
directory into that document root as `static` and `media` respectively, so
Apache finds real files at those paths instead of falling through to
Passenger.

## 9. Build and deploy the frontend

Locally (not on the server — this is a build step, the server just needs
the output):

```bash
cd frontend
REACT_APP_API_URL=https://api.msafirispace.com/api/v1 npm run build
```

Upload the **contents** of `frontend/build/` (not the folder itself) into
`public_html` via cPanel File Manager or FTP.

Add `.htaccess` in `public_html` so React Router's client-side routes don't
404 on direct access/refresh:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

## 10. Enable SSL

cPanel → **SSL/TLS Status** → select `msafirispace.com`, `www.msafirispace.com`,
and `api.msafirispace.com` → **Run AutoSSL**. Free, automatic, auto-renews —
no certbot/cron needed here.

## 11. Verify

- `https://msafirispace.com` loads the real site.
- `https://api.msafirispace.com/api/v1/listings/hotels/` returns real JSON.
- Browser dev tools, Network tab: confirm the frontend's API calls (to
  `api.msafirispace.com`) succeed and aren't blocked by CORS.

## Ongoing deploys

Backend: `git pull` into `~/msafiri_backend` (or re-upload changed files),
then re-run `migrate`/`collectstatic` if needed, then **Restart** from
Setup Python App.

Frontend: rebuild locally with `npm run build`, re-upload `build/`'s
contents to `public_html`.

## What this doesn't cover yet

Same gaps as the VPS guide — managed backups (d7-4), Sentry (d7-2), and the
M-Pesa/Paystack/Cloudinary production keys, which the app runs fine without
until those specific features are needed.
