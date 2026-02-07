"""Saf Python + pandas ile teknik indikatörler. Ek kütüphane yok (TA-Lib yok)."""
from typing import Any

import numpy as np
import pandas as pd


def _ohlcv_to_dataframe(candles: list[list]) -> pd.DataFrame:
    """ccxt OHLCV [[ts, o, h, l, c, v], ...] -> DataFrame."""
    if not candles:
        return pd.DataFrame(columns=["open", "high", "low", "close", "volume"])
    arr = np.array(candles)
    return pd.DataFrame(
        {
            "open": arr[:, 1],
            "high": arr[:, 2],
            "low": arr[:, 3],
            "close": arr[:, 4],
            "volume": arr[:, 5] if arr.shape[1] > 5 else 0.0,
        }
    )


def compute_rsi(close: pd.Series, period: int = 14) -> pd.Series:
    """RSI (Relative Strength Index). Saf pandas."""
    delta = close.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = (-delta).where(delta < 0, 0.0)
    avg_gain = gain.ewm(alpha=1 / period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    return rsi


def compute_ema(close: pd.Series, period: int) -> pd.Series:
    """Exponential Moving Average."""
    return close.ewm(span=period, adjust=False).mean()


def compute_sma(close: pd.Series, period: int) -> pd.Series:
    """Simple Moving Average."""
    return close.rolling(window=period).mean()


def compute_macd(
    close: pd.Series,
    fast: int = 12,
    slow: int = 26,
    signal: int = 9,
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """MACD line, signal line, histogram. (macd_line, signal_line, histogram)."""
    ema_fast = compute_ema(close, fast)
    ema_slow = compute_ema(close, slow)
    macd_line = ema_fast - ema_slow
    signal_line = compute_ema(macd_line, signal)
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram


def compute_all(
    candles: list[list],
    rsi_period: int = 14,
    macd_fast: int = 12,
    macd_slow: int = 26,
    macd_signal: int = 9,
    sma_period: int = 20,
    ema_period: int = 20,
) -> dict[str, Any]:
    """
    OHLCV mum listesinden tüm indikatörleri hesapla.
    candles: ccxt format [[ts, o, h, l, c, v], ...]
    Dönen değerler list (NaN'lar null), grafikte kullanılabilir.
    """
    df = _ohlcv_to_dataframe(candles)
    if df.empty or len(df) < 2:
        return {
            "rsi": [],
            "macd": [],
            "macd_signal": [],
            "macd_histogram": [],
            "sma": [],
            "ema": [],
        }

    close = df["close"].astype(float)

    rsi = compute_rsi(close, rsi_period)
    macd_line, signal_line, histogram = compute_macd(
        close, macd_fast, macd_slow, macd_signal
    )
    sma = compute_sma(close, sma_period)
    ema = compute_ema(close, ema_period)

    def to_list(s: pd.Series) -> list[float | None]:
        return [None if np.isnan(v) else float(v) for v in s]

    return {
        "rsi": to_list(rsi),
        "macd": to_list(macd_line),
        "macd_signal": to_list(signal_line),
        "macd_histogram": to_list(histogram),
        "sma": to_list(sma),
        "ema": to_list(ema),
    }
