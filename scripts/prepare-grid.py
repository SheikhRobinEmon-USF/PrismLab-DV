"""Extract the observed electricity generation series from Ember's yearly release."""
import csv
import hashlib
import json
from collections import defaultdict
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "https://files.ember-energy.org/public-downloads/generation/outputs/release_generation_yearly_global.csv"
FUELS = ("Coal", "Gas", "Other fossil", "Hydro", "Solar", "Wind", "Nuclear", "Bioenergy", "Other renewables")
METRICS = ("Total generation", "Clean", "Fossil", "Wind and solar", *FUELS)

def prepare(source, targets):
    areas = {}
    observations = defaultdict(dict)
    with source.open(encoding="utf-8-sig", newline="") as file:
        for row in csv.DictReader(file):
            year = int(row["Year"])
            code = "WLD" if row["Area"] == "World" else row["ISO 3 code"]
            fuel = row["Electricity source"]
            if year < 2000 or not code or fuel not in METRICS:
                continue
            areas[code] = (row["Area"], row["Continent"] or "World")
            key = code, year
            if fuel in observations[key]:
                raise ValueError(f"Duplicate source for {code}, {year}, {fuel}")
            observations[key][fuel] = float(row["Generation (TWh)"]) if row["Generation (TWh)"] else None
    out = {code: {"code": code, "name": name, "continent": continent, "rows": []}
           for code, (name, continent) in sorted(areas.items())}
    for (code, year), values in sorted(observations.items()):
        total = values.get("Total generation")
        if not total or values.get("Clean") is None or values.get("Fossil") is None:
            continue
        if abs(values["Clean"] + values["Fossil"] - total) > .002:
            raise ValueError(f"Group totals do not reconcile for {code} in {year}")
        out[code]["rows"].append([year, *(values.get(metric) for metric in METRICS)])
    world = out.pop("WLD")
    if len(world["rows"]) < 2 or world["rows"][-1][0] < 2025:
        raise ValueError("World coverage is incomplete")
    countries = sorted((area for area in out.values() if area["rows"]), key=lambda area: area["name"])
    for target, content in zip(targets, (world, countries), strict=True):
        target.write_text(json.dumps(content, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{len(countries)} economies, {world['rows'][0][0]}–{world['rows'][-1][0]}")
    print("Upstream SHA-256:", hashlib.file_digest(source.open("rb"), "sha256").hexdigest())

if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Usage: python scripts/prepare-grid.py <Ember CSV>\nDownload: " + SOURCE)
    prepare(Path(sys.argv[1]), (ROOT / "src/grid/world.json", ROOT / "public/grid/countries.json"))
