"""
Build script — Rinha de Backend 2026
Roda durante o build da imagem Docker (sem limite de RAM).

Lê:  resources/references.json
Gera:
  resources/index.usearch  — índice HNSW com mmap-support
  resources/labels.bin     — labels (0=legit, 1=fraud) como uint8, indexados pelo ID do usearch

Uso:
  python scripts/build_index.py
"""

import json
import sys
import time
import numpy as np
from pathlib import Path
from usearch.index import Index

# ---------------------------------------------------------------------------
# Caminhos
# ---------------------------------------------------------------------------
ROOT = Path(__file__).parent.parent
REFERENCES_PATH = ROOT / "resources" / "references.json"
INDEX_PATH      = ROOT / "resources" / "index.usearch"
LABELS_PATH     = ROOT / "resources" / "labels.bin"

# ---------------------------------------------------------------------------
# Hiperparâmetros
# Leia REGRAS_DE_DETECCAO.md antes de mudar:
#   dtype='i8'    → scalar quantization Int8 — índice menor, menos page faults
#   connectivity  → M do HNSW: mais alto = grafo maior + mais preciso, mas mais RAM
#   expansion_add → efConstruction: qualidade do índice no build (não afeta runtime)
# ---------------------------------------------------------------------------
NDIM             = 14
DTYPE            = "i8"    # Int8 scalar quantization
CONNECTIVITY     = 4      # M=12: bom balanço entre precisão e tamanho do índice
EXPANSION_ADD    = 200     # efConstruction — qualidade do build
EXPANSION_SEARCH = 32      # ef — qualidade da busca em runtime

# ---------------------------------------------------------------------------
# Carrega o dataset
# ---------------------------------------------------------------------------
print(f"[1/4] Lendo {REFERENCES_PATH} ...", flush=True)
t0 = time.perf_counter()

with open(REFERENCES_PATH, "r") as f:
    data = json.load(f)

n = len(data)
print(f"      {n:,} registros carregados em {time.perf_counter() - t0:.1f}s", flush=True)

# ---------------------------------------------------------------------------
# Converte para numpy arrays
# ---------------------------------------------------------------------------
print("[2/4] Convertendo para numpy ...", flush=True)
t0 = time.perf_counter()

vectors = np.array([item["vector"] for item in data], dtype=np.float32)  # (N, 14)
raw_labels = [item["label"] for item in data]

# Labels como uint8: 1=fraud, 0=legit
# Salvo separado porque o USearch armazena apenas IDs (inteiros), não metadata
labels = np.array([1 if lbl == "fraud" else 0 for lbl in raw_labels], dtype=np.uint8)

print(f"      shape={vectors.shape}, dtype={vectors.dtype}, "
      f"fraudes={labels.sum():,} ({labels.mean()*100:.1f}%), "
      f"legit={(1-labels).sum():,} ({(1-labels).mean()*100:.1f}%)", flush=True)
print(f"      tempo: {time.perf_counter() - t0:.1f}s", flush=True)

# ---------------------------------------------------------------------------
# Constrói o índice HNSW
# ---------------------------------------------------------------------------
print(f"[3/4] Construindo índice HNSW "
      f"(dtype={DTYPE}, M={CONNECTIVITY}, efC={EXPANSION_ADD}) ...", flush=True)
t0 = time.perf_counter()

index = Index(
    ndim=NDIM,
    metric="l2sq",
    dtype=DTYPE,
    connectivity=CONNECTIVITY,
    expansion_add=EXPANSION_ADD,
    expansion_search=EXPANSION_SEARCH,
)

# IDs são os índices 0..N-1, que usaremos para lookup em labels.bin
ids = np.arange(n, dtype=np.uint64)
index.add(ids, vectors)

elapsed = time.perf_counter() - t0
print(f"      {n:,} vetores indexados em {elapsed:.1f}s "
      f"({n/elapsed:,.0f} vetores/s)", flush=True)

# ---------------------------------------------------------------------------
# Salva em disco
# ---------------------------------------------------------------------------
print("[4/4] Salvando arquivos ...", flush=True)

index.save(str(INDEX_PATH))
index_size_mb = INDEX_PATH.stat().st_size / 1024 / 1024
print(f"      index.usearch → {index_size_mb:.1f} MB", flush=True)

labels.tofile(str(LABELS_PATH))
labels_size_kb = LABELS_PATH.stat().st_size / 1024
print(f"      labels.bin    → {labels_size_kb:.0f} KB", flush=True)

# ---------------------------------------------------------------------------
# Smoke test — verifica que o índice está funcional
# ---------------------------------------------------------------------------
print("\n[smoke test] Buscando 5 vizinhos de um vetor aleatório ...", flush=True)
test_vec = vectors[0:1]  # primeiro vetor do dataset
matches = index.search(test_vec, 5)
# flatten() garante que funciona tanto com shape (5,) quanto (1, 5)
neighbor_ids = matches.keys.flatten().tolist()
neighbor_dists = matches.distances.flatten().tolist()
print(f"      IDs encontrados: {neighbor_ids}", flush=True)
print(f"      Distâncias:      {neighbor_dists}", flush=True)
print(f"      Labels:          {[raw_labels[i] for i in neighbor_ids]}", flush=True)

print("\n✅ Índice construído com sucesso!", flush=True)
