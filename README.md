# UK Grid Stability Map

An interactive React and Leaflet dashboard for locating UK generating plant retirements and viewing the stability deficits modelled in the supplied retirement register.

## What it does

- Imports `PLANT_DATA`, `CORE_MODEL`, and `OUTPUTS` directly from an Excel workbook in the browser.
- Clusters generator markers, colours them by technology, and sizes them by `Net MW`.
- Filters the map by the 2026, 2030, 2040, and 2050 retirement horizons. Retired assets can be faded or hidden.
- Draws a node-level stability-risk layer from `CORE_MODEL` deficits and `OUTPUTS` timing classifications.
- Provides plant and node popups, horizon dashboard metrics, search, and a ranked deficit list.

## Local workflow

The application now works as a local retirement-register workspace. Import a workbook once, then use the four areas in the application rather than moving back to Excel for routine updates:

- **Map**: inspect retirement locations, capacity by planning horizon, and the selected location's retirement timeline.
- **Register**: filter records, add or edit plants, duplicate a similar record, archive obsolete records, or permanently delete local records.
- **Timeline**: view annual and cumulative retirement capacity for the records matching the current filters.
- **Data quality**: resolve missing retirement dates or coordinates, low-confidence records, duplicate names, and inconsistent node labels.

Edits are stored in this browser using local storage and remain after refresh. Use the header's register selector to switch between internal saves; the last selected register opens automatically. **Save copy** creates a named internal register from the current data, and subsequent edits are saved to that selected register. **Merge CSV** validates a plant-register CSV and creates a separate combined internal register, adding new asset IDs and updating matching ones without changing the source register. These saves are local to this browser profile and device: they are not written back to the source workbook or shared with other users.

## Built-in register and locations

The app now starts with the refined UK register and approved coordinate file bundled into the application. Workbook and coordinate uploads are no longer needed for normal use. The header includes **Reset data** to discard local edits and restore this built-in baseline.

When adding a plant, use **Find location** in the register editor to search OpenStreetMap one site at a time. Select a result to set its coordinates, or enter approved latitude and longitude manually. This is an interactive lookup, not a bulk geocoding service; it does not use a Google API key.

Run the following from the project folder only when the approved workbook or coordinate register changes:

```powershell
& '.\.tools\node\node.exe' '.\scripts\build-default-register.mjs'
```

## Stability screening overlays

The map includes optional **Inertia**, **SCL**, and **Voltage** need overlays. They are retirement-driven local screening surfaces, not a substitute for a full network study.

- Each node compares the assumed technical provision retiring by the selected horizon against total assumed provision in the local plant register. Centre-circle size ranks relative locational importance, combining the estimated provision lost with the local share lost; its colour represents the local share lost.
- Each technology is assigned a transparent per-MW screening profile. Synchronous thermal plant, nuclear, hydro, pumped storage, wind, solar, and battery assets therefore do not receive the same Inertia, SCL, or Voltage contribution.
- Each layer renders a continuous additive heat field around retiring nodes. SCL uses a tight red-orange gradient with an assumed ~30 km spread, Voltage uses a blue gradient with ~60 km spread, and Inertia uses a broader teal gradient with ~100 km spread. Darker colour means greater relative screening intensity within the selected layer; colours are not comparable between layers.
- Clickable centre markers remain above the heat field. Their size ranks relative locational importance, combining assumed provision lost and local share lost, rather than representing a physical service radius.
- The overlays label locations as low, moderate, or high screening need. They are technology-assumption screening proxies, not measured inertia, fault level, reactive margin, operational limits, or investment decisions.

The built-in baseline currently contains Great Britain records only. Use **Merge CSV** to create an internal combined register for Ireland, Northern Ireland, or Republic of Ireland data without changing that baseline. The CSV must include `asset_id`, `plant_name`, `node_id`, `node_substation`, `country`, `region`, `technology`, `net_mw`, `status`, `latitude`, and `longitude`; retirement, evidence, proxy, and quality-note columns are imported when present.

The workbook itself is not bundled into the web application. Browsers cannot safely read an arbitrary local workbook without user selection, so use **Import workbook** and choose `UK Generation Retirement Register.xlsx`.

## Setup

Install Node.js 20.19+ or 22.12+, then run the following commands from this folder:

```powershell
npm install
npm run dev
```

Vite will display a local address, normally `http://localhost:5173`. Create a production bundle with:

```powershell
npm run build
```

## Workbook mapping

The importer locates header rows rather than relying on fixed Excel row numbers.

| Sheet | Fields used |
| --- | --- |
| `PLANT_DATA` | Asset ID, Plant name, Node ID, Node / substation, Region, Technology type, Net MW, Retirement date, Confidence score |
| `CORE_MODEL` | Node ID, Node name, Region, Deficit 2030, Deficit 2040, Deficit 2050, Min confidence |
| `OUTPUTS` | Node, Deficit 2030, Deficit 2040, Deficit 2050, Timing class |

Cells containing `#REF!` are excluded from the risk layer rather than being shown as a numerical deficit. The workbook has no 2026 risk model: the 2026 dashboard uses the nearest available risk view, 2030, while retaining the 2026 asset-retirement filter.

## Coordinates

`public/plant-coordinates.csv` is the supplied coordinate-link file. It contains approximate node locations for the IDs in the current register. Replace them with approved network coordinates before analytical use.

The CSV loader accepts these columns:

```csv
Node ID,Node Name,Plant Name,Latitude,Longitude
NODE-EXAMPLE,Example node,Example plant,52.000,-1.000
```

Matching precedence is `Node ID`, then plant name, then node name for plant markers; node markers match `Node ID`, then node name. Use the **Coordinates** command in the app to import a replacement CSV without rebuilding.

## Risk classification

- Green: deficit below 25% (low risk)
- Amber: deficit from 25% to below 70% (medium risk)
- Red: deficit at least 70% (high risk)

The dashboard treats risk at or above 70% as high risk and ranks nodes by the selected horizon's deficit.

## Extending the map

`src/models.ts` contains the central layer definitions for future Synchronous Condensers, BESS, Substations, AI Data Centres, and Future Opportunity Sites. New layers can follow the same coordinate-linking contract, then be rendered as a separate Leaflet pane/component without changing the retirement or stability data model.

## Project layout

```text
src/
  components/       Leaflet map and dashboard panel
  lib/              workbook parsing, coordinate joins, risk helpers
  models.ts         shared data and layer contracts
  App.tsx           import flow, filters, map composition
public/
  plant-coordinates.csv
```