"""Rebuild the curated Parquet snapshot using the checked-in USGS source CSV."""
from pathlib import Path
import duckdb

root = Path(__file__).resolve().parents[1]
duckdb.connect().execute(
    "COPY (SELECT time, latitude, longitude, depth, mag, place, status "
    "FROM read_csv_auto(?, all_varchar=true)) TO ? (FORMAT PARQUET)",
    [str(root / "fixtures/usgs-january-2024.csv"), str(root / "public/earthquakes.parquet")],
)
