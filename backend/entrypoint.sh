#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
    case "$DATABASE_URL" in
        postgres*)
            echo "Waiting for Postgres..."
            until pg_isready -d "$DATABASE_URL" -q; do
                sleep 1
            done
            ;;
    esac
fi

python manage.py migrate --noinput
python manage.py collectstatic --noinput

exec "$@"
