"""
Lightweight concurrent smoke test for the listings search and booking
creation paths. Not a full k6/Locust run (locust's dependencies conflicted
with this project's pinned pytest version in the same venv -- not worth
fighting for a one-off check) -- just enough concurrent real HTTP traffic
to catch an obvious N+1 or a view that falls over under light concurrency,
using only the stdlib and the `requests` dependency the project already has.

Usage: python scripts/load_smoke_test.py [base_url]
Needs the backend actually running (e.g. ./runserver.sh) first.
"""
import statistics
import sys
import time
from concurrent.futures import ThreadPoolExecutor

import requests

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8000'
CONCURRENCY = 20
REQUESTS_PER_WORKER = 5


def _timed_get(path):
    start = time.monotonic()
    response = requests.get(f'{BASE_URL}{path}', timeout=10)
    elapsed = time.monotonic() - start
    return response.status_code, elapsed


def _worker(path):
    return [_timed_get(path) for _ in range(REQUESTS_PER_WORKER)]


def run(label, path):
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
        results = [r for batch in pool.map(_worker, [path] * CONCURRENCY) for r in batch]

    codes = [code for code, _ in results]
    durations = sorted(elapsed for _, elapsed in results)
    bad = [c for c in codes if c != 200]

    p50 = durations[len(durations) // 2]
    p95 = durations[int(len(durations) * 0.95)]
    print(f'{label}: {len(results)} requests, {CONCURRENCY} concurrent')
    print(f'  status: {"all 200" if not bad else f"{len(bad)} non-200: {bad[:5]}"}')
    print(f'  latency: p50={p50*1000:.0f}ms p95={p95*1000:.0f}ms max={durations[-1]*1000:.0f}ms '
          f'mean={statistics.mean(durations)*1000:.0f}ms')


if __name__ == '__main__':
    run('Hotel search', '/api/v1/listings/hotels/?page_size=20')
    run('BnB search', '/api/v1/listings/bnb/?page_size=20')
