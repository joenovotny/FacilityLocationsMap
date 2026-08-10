# Strategic Facility Locations Map

A static GitHub Pages app built with MapLibre GL JS and OpenFreeMap. It uses no paid map or geocoding APIs and never creates coordinates.

## Update the data

The Excel workbook remains the master dataset. Replace the workbook in `source-data/`, then run:

```bash
python3 -m pip install -r requirements.txt
python3 scripts/convert_excel.py source-data/Strategic_End_User_Facilities_Bottler_Expansion_v2.xlsx
```

The converter reads `Master Facilities v2`, validates the required columns, and writes `data/facilities.json`. A facility is marked `mapped: true` only when both source latitude and longitude are present, numeric, and in valid ranges. No address geocoding or coordinate inference occurs.

Serve the project locally (opening `index.html` directly will not allow JSON fetching):

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Account logos

`data/account-logos.json` maps exact `Ultimate Parent` values to free logo image URLs or repository-relative image paths. Accounts without an entry receive a letter-mark fallback. To keep logos fully self-hosted, place image files in `assets/logos/` and change the mappings to paths such as `assets/logos/example.svg`.

## GitHub Pages

In the repository settings, choose **Pages → Deploy from a branch**, then select the `main` branch and `/ (root)`. The checked-in JSON makes the site static; rerun the converter and commit the new JSON whenever Excel changes.

