# Strategic Facility Locations Map

A static GitHub Pages app built with MapLibre GL JS and OpenFreeMap. It uses no paid map or geocoding APIs and never creates coordinates. Every facility with supplied coordinates is rendered as an individual, unclustered map pin.

## Update the data

The Excel workbook remains the master dataset. Replace the workbook in `source-data/`, then run:

```bash
python3 -m pip install -r requirements.txt
python3 scripts/convert_excel.py source-data/Strategic_End_User_Facilities_Bottler_Expansion_V3.xlsx
```

The converter reads `Master Facilities v2`, validates the required columns, and writes `data/facilities.json`. A facility is marked `mapped: true` only when both master latitude and longitude are present, numeric, and in valid ranges. Coordinates may be exact address matches, non-exact street matches, official city-level points, or GeoNames city-center fallbacks; the `Coordinate Audit` sheet records the method and quality for every row. Shared city-center pins are spread slightly in the web display so each facility remains clickable, without changing the stored Excel coordinates.

Approximate city-center data is derived from [GeoNames](https://www.geonames.org/) under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Serve the project locally (opening `index.html` directly will not allow JSON fetching):

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Account logos

`data/account-logos.json` maps exact `Ultimate Parent` values to free logo image URLs or repository-relative image paths. Accounts without an entry receive a letter-mark fallback. To keep logos fully self-hosted, place image files in `assets/logos/` and change the mappings to paths such as `assets/logos/example.svg`.

## GitHub Pages

In the repository settings, choose **Pages → Deploy from a branch**, then select the `main` branch and `/ (root)`. The checked-in JSON makes the site static; rerun the converter and commit the new JSON whenever Excel changes.
