"""ML eğitim: OHLCV → özellikler → sınıflandırıcı → artifact (joblib)."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split

FEATURE_NAMES = [
    "getiri_1", "getiri_2", "getiri_3", "getiri_5",
    "ma_5_20_oran", "hacim_degisim",
]


def ohlcv_to_feature_dict(candles: list[list]) -> dict[str, float]:
    """Son mumdan özellik sözlüğü (scheduler/predict için)."""
    if len(candles) < 21:
        return {n: 0.0 for n in FEATURE_NAMES}
    closes = [c[4] for c in candles]
    volumes = [c[5] if len(c) > 5 else 0.0 for c in candles]
    arr = _ohlcv_to_features(closes, volumes)
    if len(arr) == 0:
        return {n: 0.0 for n in FEATURE_NAMES}
    return dict(zip(FEATURE_NAMES, arr.tolist()))  # type: ignore[arg-type]


def _ohlcv_to_features(closes: list[float], volumes: list[float]) -> np.ndarray:
    """Son N mumdan özellik vektörü (FEATURE_NAMES sırasıyla)."""
    if len(closes) < 21 or len(volumes) < 21:
        return np.array([])
    c = np.array(closes, dtype=float)
    v = np.array(volumes, dtype=float)
    ret = np.diff(c) / (c[:-1] + 1e-12)
    getiri_1 = ret[-1]
    getiri_2 = ret[-2] if len(ret) >= 2 else 0.0
    getiri_3 = ret[-3] if len(ret) >= 3 else 0.0
    getiri_5 = ret[-5] if len(ret) >= 5 else 0.0
    ma5 = np.mean(c[-5:])
    ma20 = np.mean(c[-20:])
    ma_5_20_oran = (ma5 / (ma20 + 1e-12)) - 1.0
    hacim_son = np.mean(v[-3:]) if len(v) >= 3 else v[-1]
    hacim_once = np.mean(v[-6:-3]) if len(v) >= 6 else hacim_son
    hacim_degisim = (hacim_son / (hacim_once + 1e-12)) - 1.0
    return np.array([
        getiri_1, getiri_2, getiri_3, getiri_5,
        ma_5_20_oran, hacim_degisim,
    ], dtype=np.float32)


def build_Xy(candles: list[list]) -> tuple[np.ndarray, np.ndarray]:
    """OHLCV mum listesinden X (özellikler) ve y (hedef: sonraki mum yukarı mı 1/0)."""
    if len(candles) < 22:
        return np.array([]), np.array([])
    closes = [c[4] for c in candles]
    volumes = [c[5] if len(c) > 5 else 0.0 for c in candles]
    X_list = []
    y_list = []
    for i in range(20, len(closes) - 1):
        feat = _ohlcv_to_features(closes[: i + 1], volumes[: i + 1])
        if len(feat) == 0:
            continue
        X_list.append(feat)
        y_list.append(1 if closes[i + 1] > closes[i] else 0)
    if not X_list:
        return np.array([]), np.array([])
    return np.array(X_list), np.array(y_list)


def train_and_save(
    candles: list[list],
    artifact_dir: str,
    model_name: str,
    version: str,
    test_size: float = 0.2,
    random_state: int = 42,
) -> tuple[str, dict[str, Any]]:
    """
    OHLCV ile eğit, joblib ile kaydet.
    Returns: (artifact_path, metrics_dict)
    """
    X, y = build_Xy(candles)
    if len(X) < 10:
        raise ValueError("Yetersiz veri: en az 10 örnek gerekli")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, shuffle=False
    )
    if len(X_train) < 5:
        raise ValueError("Eğitim seti çok küçük")

    model = LogisticRegression(max_iter=500, random_state=random_state)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    acc = float(accuracy_score(y_test, y_pred))

    path = Path(artifact_dir).resolve()
    path.mkdir(parents=True, exist_ok=True)
    filename = f"{model_name}_{version}.joblib".replace("/", "_").replace(" ", "_")
    full_path = path / filename
    artifact = {
        "model": model,
        "feature_names": FEATURE_NAMES,
    }
    joblib.dump(artifact, full_path)

    return str(full_path), {
        "accuracy": round(acc, 4),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "feature_names": FEATURE_NAMES,
    }


def load_and_predict(artifact_path: str, features: dict[str, float]) -> int:
    """Artifact'tan model yükle, features sözlüğünden vektör oluştur, tahmin döndür (0 veya 1)."""
    if not os.path.isfile(artifact_path):
        raise FileNotFoundError(f"Model dosyası bulunamadı: {artifact_path}")
    artifact = joblib.load(artifact_path)
    model = artifact["model"]
    names = artifact.get("feature_names", FEATURE_NAMES)
    vec = np.array([float(features.get(n, 0.0)) for n in names], dtype=np.float32).reshape(1, -1)
    return int(model.predict(vec)[0])
