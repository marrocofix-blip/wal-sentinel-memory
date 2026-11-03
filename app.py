import requests
import streamlit as st
from datetime import datetime, timezone

st.set_page_config(page_title="WAL Sentinel Memory", page_icon="🧠")
st.title("🧠 WAL Sentinel Memory")
st.caption("Hackathon prototype · READ ONLY · PAPER ONLY · REAL TRADING OFF")

@st.cache_data(ttl=60)
def fetch_candles():
    response = requests.get(
        "https://api.binance.com/api/v3/klines",
        params={"symbol": "WALUSDT", "interval": "15m", "limit": 60},
        timeout=12,
    )
    response.raise_for_status()
    data = response.json()
    if not isinstance(data, list) or len(data) < 2:
        raise ValueError("Unexpected market data")
    # Exclude the newest potentially unfinished candle.
    return data[:-1]

try:
    candles = fetch_candles()
    closes = [float(c[4]) for c in candles]
    st.metric("WAL/USDT (Binance, indicative)", f"${closes[-1]:.8f}")
    st.line_chart(closes)
    st.info("Historical public-market data only, not a live Revolut X quote or a trading recommendation.")
except Exception as exc:
    st.warning(f"Market feed unavailable: {type(exc).__name__}; no invented prices shown.")

st.subheader("Prediction journal (demo only)")
with st.form("prediction"):
    direction = st.selectbox("Hypothesis", ["UP", "DOWN", "SIDEWAYS"])
    horizon = st.selectbox("Evaluation horizon", ["1h", "4h", "24h"])
    reasoning = st.text_area("Reasoning and evidence")
    submitted = st.form_submit_button("Create demo prediction record")
if submitted:
    st.json({
        "created_at": datetime.now(timezone.utc).isoformat(),
        "direction": direction,
        "horizon": horizon,
        "reasoning": reasoning,
        "status": "DEMO_ONLY_NOT_WRITTEN_TO_WALRUS",
    })
    st.warning("This prediction has NOT been stored in Walrus Mainnet.")

st.subheader("Integration readiness")
for label, done in [
    ("Public market data integration", True),
    ("Walrus Memory Mainnet verified", False),
    ("Tatum Sui RPC verified", False),
    ("10+ Mainnet memories verified", False),
]:
    st.checkbox(label, value=done, disabled=True)
