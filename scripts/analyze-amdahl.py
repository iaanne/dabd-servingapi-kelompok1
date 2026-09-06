#!/usr/bin/env python
"""Analisis Tugas 2 - Verifikasi Amdahl's Law (speedup & batas paralel).

Membaca data/task2/n<N>-c200.json (k6 --summary-export), lalu:
  - ringkasan CSV        -> data/task2/summary.csv
  - chart speedup vs N   -> results/charts/amdahl_speedup_vs_nodes.png
  - fitting porsi paralel p -> mencocokkan S(N) = 1 / ((1-p) + p/N)
"""
import glob
import json
import os
import re

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data", "task2")
CHART = os.path.join(ROOT, "results", "charts")


def parse(path: str) -> dict:
    with open(path) as f:
        d = json.load(f)
    m = d["metrics"]
    dur = m["http_req_duration"]
    reqs = m["http_reqs"]
    fn = os.path.basename(path)
    n = int(re.match(r"n(\d+)-", fn).group(1))
    return {
        "nodes": n,
        "throughput_rps": reqs["rate"],
        "latency_avg_ms": dur["avg"],
        "p90_ms": dur.get("p(90)", float("nan")),
        "p95_ms": dur.get("p(95)", float("nan")),
    }


def amdahl(p: float, n: int) -> float:
    return 1.0 / ((1.0 - p) + p / n)


def main():
    files = sorted(glob.glob(os.path.join(DATA, "n*-*.json")))
    if not files:
        raise SystemExit(f"Tidak ada data di {DATA}. Jalankan scripts/run-amdahl.sh dulu.")
    df = pd.DataFrame([parse(p) for p in files]).sort_values("nodes")

    base = df.iloc[0]["throughput_rps"]
    df["speedup"] = df["throughput_rps"] / base
    df.to_csv(os.path.join(DATA, "summary.csv"), index=False)

    # --- estimasi porsi paralel (p) dari N=2 ---
    s2 = df[df.nodes == 2]["speedup"].iloc[0]
    p_fit = 2 * (1 - 1 / s2)
    nodes_sim = list(range(1, 9))
    theo = [amdahl(p_fit, n) for n in nodes_sim]

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.plot(df["nodes"], df["speedup"], "o-", label="Speedup terukur (throughput N / throughput 1)")
    ax.plot(nodes_sim, theo, "r--", label=f"Amdahl S(N) dengan p={p_fit:.3f}")
    ax.plot(nodes_sim, nodes_sim, "g:", label="Ideal linear (p=1)")
    ax.axhline(1 / (1 - p_fit), color="k", ls=":", alpha=0.7,
               label=f"Batas mutlak 1/(1-p) = {1/(1-p_fit):.2f} x")
    ax.set_xlabel("Jumlah node (N)")
    ax.set_ylabel("Speedup S(N)")
    ax.set_title("Amdahl's Law: Speedup jenuh karena bagian serial (Nginx)")
    ax.legend()
    ax.grid(True, ls="--", alpha=0.4)
    fig.tight_layout()
    fig.savefig(os.path.join(CHART, "amdahl_speedup_vs_nodes.png"), dpi=150)

    print(df.round(3).to_string(index=False))
    print(f"\nEstimasi porsi paralel p = {p_fit:.3f}  =>  batas mutlak / puncak speedup = {1/(1-p_fit):.2f} x")
    print(f"Summary CSV -> {DATA}/summary.csv")
    print("Chart        -> " + os.path.join(CHART, "amdahl_speedup_vs_nodes.png"))


if __name__ == "__main__":
    main()