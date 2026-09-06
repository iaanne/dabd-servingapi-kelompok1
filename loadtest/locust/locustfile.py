"""Locust load test - unduh file statis dari API Serving File.

Cara pakai:
    ../tools/venv/bin/locust -f loadtest/locust/locustfile.py \
        --host http://localhost:3001 --headless \
        -u 50 -r 10 -t 30s \
        --csv data/raw/locust-10mb-c50 \
        -H "X-Test: locust"

Environment (opsional):
    LOCUST_FILE  nama file dummy, default "1mb.bin"
"""

import os

from locust import HttpUser, task

FILE = os.environ.get("LOCUST_FILE", "1mb.bin")


class FileDownloadUser(HttpUser):
    """Setiap virtual user berulang-ulang mengunduh file dummy."""

    wait_time = lambda self: 0  # noqa: E731 - zero think time, load seluruhnya

    @task
    def download_file(self):
        self.client.get(f"/files/{FILE}", name=f"GET /files/{FILE}")