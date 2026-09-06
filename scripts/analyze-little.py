#!/usr/bin/env python
"""Analisis Tugas 1 - Verifikasi Little's Law (L = lambda * W).

Membaca data/task1/*.json (k6 --summary-export), lalu membuat:
  - ringkasan CSV  -> data/task1/summary.csv
  - charts:
      results/charts/little_latency_vs_size.png
      results/charts/little_throughput_vs_concurrency.png
      results/charts/little_L_calc_vs_measured.png
"""
import glob
import json
import re
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data", "task1")
CHART = os.path.join(ROOT, "results", "charts")

SIZE_KB = {"1kb": 1, "100kb": 100, "1mb": 1024, "10mb": 10240}


def file_size_kb(name: str) -> int:
    return SIZE_KB.get(name, 0)


def parse(path: str) -> dict:
    with open(path) as f:
        d = json.load(f)
    m = d["metrics"]
    dur = m["http_req_duration"]            # ms
    reqs = m["http_reqs"]                   # count & rate (req/s)
    failed = m.get("http_req_failed", {}).get("value", 0.0)
    fname = os.path.basename(path)
    mo = re.match(r"(.+)-c(\d+)\.json", fname)
    size_name, vus = mo.group(1), int(mo.group(2))
    rate = reqs["rate"]
    W_sec = dur["avg"] / 1000.0             # ms -> s
    L_calc = rate * W_sec                   # Little's Law
    L_measured = float(vus)
    return {
        "size": size_name,
        "size_kb": file_size_kb(size_name),
        "vus": vus,
        "throughput_rps": rate,
        "latency_avg_ms": dur["avg"],
        "p90_ms": dur.get("p(90)", float("nan")),
        "p95_ms": dur.get("p(95)", float("nan")),
        "p99_ms": dur.get("p(99)", float("nan")),
        "failed_rate": failed,
        "L_measured": L_measured,
        "L_calc": L_calc,
        "L_ratio": L_calc / L_measured,
    }


def main():
    files = sorted(glob.glob(os.path.join(DATA, "*.json")))
    if not files:
        raise SystemExit(f"Tidak ada data di {DATA}. Jalankan scripts/run-little.sh dulu.")
    rows = [parse(p) for p in files]
    df = pd.DataFrame(rows)
    df = df.sort_values(["size_kb", "vus"])
    os.makedirs(CHART, exist_ok=True)

    df.to_csv(os.path.join(DATA, "summary.csv"), index=False)

    # --- chart 1: latency (avg/p90/p95) vs ukuran file, per concurrency ---
    fig, ax = plt.subplots(figsize=(8, 5))
    for c, col, lab in [("#1f77b4", "latency_avg_ms", "avg"),
                        ("#ff7f0e", "p90_ms", "p90"),
                        ("#d62728", "p95_ms", "p95")]:
        g = df.groupby("size_kb")[col].mean()
        ax.plot(g.index, g.values, marker="o", label=lab, color=c)
    ax.set_xscale("log")
    ax.set_yscale("log")
    ax.set_xlabel("Ukuran file (KB)")
    ax.set_ylabel("Latency (ms)")
    ax.set_title("Little's Law: Latency membengkak seiring ukuran file")
    ax.legend()
    ax.grid(True, which="both", ls="--", alpha=0.4)
    fig.tight_layout()
    fig.savefig(os.path.join(CHART, "little_latency_vs_size.png"), dpi=150)

    # --- chart 2: throughput vs concurrency per ukuran file ---
    fig, ax = plt.subplots(figsize=(8, 5))
    for size_name in SIZE_KB:
        s = df[df["size"] == size_name]
        ax.plot(s["vus"], s["throughput_rps"], marker="o", label=size_name)
    ax.set_xlabel("Concurrency (virtual users)")
    ax.set_ylabel("Throughput (req/s)")
    ax.set_title("Little's Law: Throughput vs Concurrency")
    ax.legend()
    ax.grid(True, ls="--", alpha=0.4)
    fig.tight_layout()
    fig.savefig(os.path.join(CHART, "little_throughput_vs_concurrency.png"), dpi=150)

    # --- chart 3: L_calc (lambda*W) vs L_measured ---
    fig, ax = plt.subplots(figsize=(6.5, 6))
    ax.scatter(df["L_measured"], df["L_calc"], c=df["size_kb"], cmap="viridis")
    hi = max(df["L_measured"].max(), df["L_calc"].max()) * 1.1
    ax.plot([0, hi], [0, hi], "r--", label="L_calc = L_measured (ideal)")
    cb = plt.colorbar(ax.collections[0])
    cb.set_label("Ukuran file (KB)")
    ax.set_xlabel("L measured (concurrency injeksi, VU)")
    ax.set_ylabel("L calc  =  throughput x latency  (lambda x W)")
    ax.set_title("Little's Law: L_calc vs L_measured")
    ax.legend()
    ax.grid(True, ls="--", alpha=0.4)
    fig.tight_layout()
    fig.savefig(os.path.join(CHART, "little_L_calc_vs_measured.png"), dpi=150)

    pd.set_option("display.width", 160)
    print(df.to_string(index=False))
    print(f"\nSummary CSV -> {DATA}/summary.csv")
    print("Charts       -> " + os.path.join(CHART, "little_*.png"))


if __name__ == "__main__":
    main()