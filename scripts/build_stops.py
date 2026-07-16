#!/usr/bin/env python3
"""Build stops.json from a Sarajevo GTFS zip."""

import csv
import json
import sys
import zipfile


def main() -> None:
    if len(sys.argv) != 3:
        print("Usage: build_stops.py <gtfs.zip> <output.json>")
        sys.exit(1)

    zip_path, output_path = sys.argv[1], sys.argv[2]
    stops = []

    with zipfile.ZipFile(zip_path) as archive:
        with archive.open("stops.txt") as handle:
            for row in csv.DictReader(line.decode("utf-8") for line in handle):
                stops.append(
                    {
                        "id": row["stop_id"],
                        "name": row["stop_name"],
                        "lat": float(row["stop_lat"]),
                        "lon": float(row["stop_lon"]),
                    }
                )

    with open(output_path, "w", encoding="utf-8") as out:
        json.dump(stops, out, ensure_ascii=False)

    print(f"Wrote {len(stops)} stops to {output_path}")


if __name__ == "__main__":
    main()
