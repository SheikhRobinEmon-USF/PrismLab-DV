"""Transform the public source downloads listed in docs/case-research.md."""
import csv
import hashlib
import json
import sys
from datetime import date
from pathlib import Path

if len(sys.argv) != 2:
    sys.exit("Usage: python scripts/prepare-cases.py <public-downloads-directory>")

root = Path(__file__).resolve().parents[1]
raw = Path(sys.argv[1])
output = root / "public" / "research"

def save(slug, files, data):
    data["provenance"] = {name: hashlib.sha256((raw / name).read_bytes()).hexdigest() for name in files}
    (output / f"{slug}.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")

def load_json(name):
    return json.loads((raw / name).read_text(encoding="utf-8"))

def temperature():
    rows = []
    with (raw / "temperature.csv").open() as source:
        next(source)
        next(source)
        for line in csv.reader(source):
            year = int(line[0])
            if year <= 2025 and line[13] != "***":
                rows.append([year, float(line[13]), *[None if value == "***" else float(value) for value in line[1:13]]])
    assert [row[0] for row in rows] == list(range(1880, 2026))
    save("warming", ["temperature.csv"], {"rows": rows})

def connectivity():
    metadata, observations = load_json("internet.json")
    assert metadata["pages"] == 1 and metadata["total"] == len(observations)
    economies = {row["id"]: {"id": row["id"], "name": row["name"], "region": row["region"]["value"].strip(), "values": {}}
                 for row in load_json("countries.json")[1] if row["region"]["id"] != "NA"}
    economies["WLD"] = {"id": "WLD", "name": "World", "region": "", "values": {}}
    for row in observations:
        id = row["countryiso3code"]
        value = row["value"]
        if id in economies and value is not None:
            assert 0 <= value <= 100
            economies[id]["values"][int(row["date"])] = round(value, 3)
    save("digital-divide", ["internet.json", "countries.json"], {
        "release": metadata["lastupdated"],
        "rows": sorted([area for area in economies.values() if area["values"]], key=lambda area: area["name"]),
    })

def transit():
    fields = (
        ("subway", "Subway", "subways_total_estimated_ridership", "subways_of_comparable_pre_pandemic_day"),
        ("bus", "Bus", "buses_total_estimated_ridersip", "buses_of_comparable_pre_pandemic_day"),
        ("lirr", "Long Island Rail Road", "lirr_total_estimated_ridership", "lirr_of_comparable_pre_pandemic_day"),
        ("metro", "Metro-North", "metro_north_total_estimated_ridership", "metro_north_of_comparable_pre_pandemic_day"),
        ("bridges", "Bridges & tunnels", "bridges_and_tunnels_total_traffic", "bridges_and_tunnels_of_comparable_pre_pandemic_day"),
    )
    seen = set()
    rows = []
    for row in load_json("mta.json"):
        d = date.fromisoformat(row["date"][:10])
        if d.year > 2024:
            continue
        assert d not in seen
        seen.add(d)
        values = [[int(row[count]) if row.get(count) is not None else None,
                   float(row[baseline]) if row.get(baseline) is not None else None] for _, _, count, baseline in fields]
        rows.append([d.isoformat(), d.weekday() >= 5, values])
    assert len(seen) == (date(2024, 12, 31) - date(2020, 3, 1)).days + 1
    save("transit-recovery", ["mta.json"], {"modes": [[id, name] for id, name, *_ in fields], "rows": rows})

def earthquakes():
    seen = set()
    rows = []
    with (raw / "quakes.csv").open() as source:
        for row in csv.DictReader(source):
            if row["type"] != "earthquake":
                continue
            event_id = row["id"]
            assert event_id not in seen
            seen.add(event_id)
            magnitude = float(row["mag"])
            assert magnitude >= 6
            rows.append([event_id, row["time"][:10], magnitude, float(row["depth"]) if row["depth"] else None,
                         float(row["longitude"]), float(row["latitude"]), row["place"]])
    save("seismic-atlas", ["quakes.csv"], {"rows": rows})

output.mkdir(parents=True, exist_ok=True)
for prepare in (temperature, connectivity, transit, earthquakes):
    prepare()
