"""
Fail CI on any pip-audit finding except the four packages whose
vulnerabilities are the known, documented tradeoff of pinning Django to
4.0.10 for the shared host's Postgres 10.x (see requirements.txt and the
"chore(backend): pin Django to 4.0.10" commit) -- upgrading any of them
pulls in Django 4.2.16+/5.x transitively. Revisit this allowlist once the
VPS move (2026-11-12) lets Django go back up.

Usage: pip-audit -r requirements.txt --format json | python scripts/check_pip_audit.py
"""
import json
import sys

ACCEPTED_PENDING_DJANGO_UPGRADE = {
    'django', 'djangorestframework', 'djangorestframework-simplejwt', 'django-allauth',
}

data = json.load(sys.stdin)
unexpected = [
    dep for dep in data.get('dependencies', [])
    if dep.get('vulns') and dep['name'].lower() not in ACCEPTED_PENDING_DJANGO_UPGRADE
]

if unexpected:
    for dep in unexpected:
        ids = ', '.join(v['id'] for v in dep['vulns'])
        print(f"{dep['name']} {dep['version']}: {ids}")
    sys.exit(1)

print('No unexpected vulnerabilities (Django/DRF/simplejwt/allauth accepted pending VPS move).')
