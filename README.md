# UK Grid Stability Map

UK Grid Stability Map is a static React and Leaflet application for maintaining and exploring a plant retirement register. It maps generation assets, provides retirement timelines, identifies data-quality issues, and calculates relative locational screening overlays for inertia, short-circuit level (SCL), and voltage-support loss.

It is an analytical screening tool, not a power-flow, fault-level, transient-stability, operational-security, or investment-decision model. Retirement timing, evidence, coordinates, and technology assumptions must be reviewed before use in decisions.

## Shareable site

The GitHub Pages workflow in [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml) publishes the current `main` branch to [https://gpmcentrica.github.io/grid-stability-map/](https://gpmcentrica.github.io/grid-stability-map/) after every push. In the repository's **Settings > Pages**, set the deployment source to **GitHub Actions** once.

GitHub Pages hosts a static site. The version-controlled JSON register is the communal published baseline. Browser edits are private scenarios: they do not update GitHub or become visible to other users. Updating the communal baseline requires a reviewed source change on `main`.

## What it does

- Clusters generator markers, colours them by technology, and sizes them by `Net MW`.
- Filters the map by the 2026, 2030, 2040, and 2050 retirement horizons. Retired assets can be faded or hidden.
- Provides plant and node popups, horizon dashboard metrics, register and map search, plus a retirement timeline.
- Displays optional relative Inertia, SCL, and Voltage screening overlays and an optional OpenInfraMap network layer.

## Portfolio workspaces

The main navigation has five areas: **Retirement**, **Future Generation**, **Centrica**, **Timeline**, and **Data quality**. Retirement, Future Generation, and Centrica each provide the same Map and Register views, with separate browser-local register copies and backups.

- **Retirement** uses the published 17 July 2026 system retirement register and retains the retirement-driven screening overlays.
- **Future Generation** starts with two clearly labelled sample projects. Its register records project status and confirmed or modelled commissioning timing; replace or add to these samples with governed project data.
- **Centrica** starts with the 29-record operational dataset supplied in `Operational Data.xlsx`, including 18 operational assets and 11 AUC entries. All records remain browser-editable; source lifecycle, voltage, dates, and missing values are retained for review.
- **Timeline** compares the active Retirement register's scheduled capacity loss with the active Future Generation register's expected commissioning capacity. Centrica is a separate portfolio view and is not added to avoid double counting.
- **Data quality** can review all portfolios together or one portfolio at a time, and opens a matching record in its own register editor.

## Local workflow

The application is a portfolio-register workspace. Use the five application areas for routine analysis and scenario work:

- **Retirement**: inspect retirement locations, capacity by planning horizon, and retirement-driven screening overlays.
- **Future Generation**: maintain planned generation projects, their capacity, location, and expected commissioning timing.
- **Centrica**: maintain the current Centrica-owned asset portfolio using the same map and register pattern.
- **Timeline**: compare annual retirement capacity with future commissioning capacity and their net change.
- **Data quality**: resolve timing, coordinate, confidence, duplicate-name, and node-label issues across the selected portfolio.

The default active register is the **Shared register - 17 Jul 2026** published with the GitHub Pages site. It contains 53 records covering Great Britain, Northern Ireland, and the Republic of Ireland, so everyone opening the deployed site starts from the same communal baseline. Its authoritative source is [src/data/plant-register-2026-07-17.json](src/data/plant-register-2026-07-17.json). [src/data/default-register.ts](src/data/default-register.ts) is the generated copy consumed by the app and must not be edited manually.

Use the header's register selector to switch between the shared baseline and local saved copies. **Save copy** creates a named local register from the current data, and subsequent edits are saved automatically to that selected register. **Merge CSV** validates a plant-register CSV and creates a separate combined local register, adding new asset IDs and updating matching ones without changing the shared source register. **Restore data** replaces the selected local register from a JSON backup after confirmation; **Backup data** downloads the current register as JSON.

### Submit a register change through GitHub

The site remains publicly readable. The header's **Publish** action is available only after a user authenticates with GitHub and has permission to write to `GPMCentrica/grid-stability-map`. It creates a separate branch and a pull request; it never writes directly to `main`. A maintainer reviews and merges that pull request, then the existing Pages workflow publishes the new baseline.

To enable browser publication, create a GitHub OAuth App for the site, enable its **Device Flow**, and add the OAuth App **Client ID** as the repository Actions variable `OAUTH_CLIENT_ID`. A client ID is public and can be included in the static build; do not add an OAuth client secret, PAT, or other credential to the site or repository. Users may also enter the public client ID in the Publish dialog while testing locally. The access token returned by GitHub is held only in browser memory for that publish session.

Merged browser submissions write one of these version-controlled override files, which become the shared default on the next deployment:

- `src/data/published-retirement-register.json`
- `src/data/published-future-generation-register.json`
- `src/data/published-centrica-register.json`

When a published override changes, the application detects the changed baseline and makes it active for users who were using the previous shared baseline. Existing named local scenarios remain available in the register selector.

Local registers are stored only in the current browser profile and device through `localStorage` (`uk-grid-stability-workspace-v8`). Clear browser storage, switch browser/profile, or use another device and those local scenarios will not be available unless exported first. The versioned storage key migrates older workspaces when they are first opened. A v5 Centrica sample baseline is preserved as a separate local copy, the v7 migration activates the owner-enriched retirement baseline, and the v8 migration activates the updated Centrica operational register while retaining its prior baseline as a separate local copy.

## Published register maintenance

Use this workflow for every change that should be visible to all site users:

1. Update [src/data/plant-register-2026-07-17.json](src/data/plant-register-2026-07-17.json). Preserve unique `assetId` values when correcting existing assets.
2. Record a traceable source in `evidenceSource`; for a modelled retirement, provide both `modelledRetirementYear` and `modelledRetirementReason`.
3. Run `node .\scripts\build-default-register.mjs` from the project folder to regenerate `src/data/default-register.ts`.
4. Run `npm run build` and resolve every error.
5. Review the JSON source and generated file together, commit both, and push to `main`.
6. Confirm the **Deploy GitHub Pages** workflow succeeds, then hard-refresh the live site and verify the active register and data.

If the published source file is renamed for a future data release, update its path and the `importedFileName` in [scripts/build-default-register.mjs](scripts/build-default-register.mjs), the shared register name in [src/App.tsx](src/App.tsx), and this README.

### Register schema

Each record represents a generating asset. JSON backup validation requires `assetId`, `name`, `nodeId`, `nodeName`, `region`, `technology`, numeric `netMw`, numeric `latitude` and `longitude`, and boolean `hasCoordinates`.

| Field | Purpose |
| --- | --- |
| `assetId` | Stable unique ID. Used as the CSV-merge key. |
| `name`, `nodeId`, `nodeName`, `region`, `country`, `technology` | Asset identity, grouping, and filter fields. |
| `netMw` | Net capacity, used for marker size and retirement totals. |
| `status` | `Active`, `Retiring`, `Retired`, or `Archived`. Archived assets are excluded from standard views and need overlays. |
| `retirementBasis` | `Confirmed`, `Modelled`, or `Unconfirmed`. |
| `retirementDate` | Preferred ISO date (`YYYY-MM-DD`) for confirmed timing. |
| `modelledRetirementYear`, `modelledRetirementReason` | Required model assumption and reason for a modelled timing. |
| `retirementClass`, `confidenceScore`, `evidenceSource`, `notes` | Evidence and data-quality fields. |
| `inertiaProxy`, `faultLevelProxy`, `reactiveProxy` | Retained legacy data fields. The current overlays use technology-based per-MW assumptions instead. |

The Register editor requires a plant name and positive net MW. It requires a date for a confirmed retirement and a year plus reason for a modelled retirement. It derives a Node ID from the node name if none is provided. Use **Find location** for a one-at-a-time OpenStreetMap lookup, then verify the selected coordinates against approved network information; it is not a bulk geocoding process.

### CSV merge schema

The required CSV headers are:

```csv
asset_id,plant_name,node_id,node_substation,country,region,technology,net_mw,status,latitude,longitude
```

Optional columns are `retirement_date`, `retirement_basis`, `retirement_class`, `confidence_score`, `evidence_source`, `modelled_retirement_year`, `modelled_retirement_reason`, `inertiaProxy`, `faultLevelProxy`, `reactiveProxy`, and `data_quality_note`. Valid values are `Active`, `Retiring`, `Retired`, or `Archived` for `status`, and `Confirmed`, `Modelled`, or `Unconfirmed` for `retirement_basis`. A CSV merge is always browser-local and never changes the communal source JSON.

## Built-in register and locations

The app starts with the published 17 July 2026 GB, Northern Ireland, and Republic of Ireland register bundled into the application. Workbook and coordinate uploads are no longer needed for normal use. When this release first loads, the prior browser workspace is superseded so the shared baseline becomes active.

When adding a plant, use **Find location** in the register editor to search OpenStreetMap one site at a time. Select a result to set its coordinates, or enter approved latitude and longitude manually. This is an interactive lookup, not a bulk geocoding service; it does not use a Google API key.

Run the following from the project folder only when the published register changes:

```powershell
node .\scripts\build-default-register.mjs
```

## Stability screening overlays

The map includes optional **Inertia**, **SCL**, and **Voltage** need overlays. They are retirement-driven local screening surfaces, not a substitute for a full network study.

- Each node compares the assumed technical provision retiring by the selected horizon against total assumed provision in the local plant register. Centre-circle size ranks relative locational importance, combining the estimated provision lost with the local share lost; its colour represents the local share lost.
- Each technology is assigned a transparent per-MW screening profile. Synchronous thermal plant, nuclear, hydro, pumped storage, wind, solar, and battery assets therefore do not receive the same Inertia, SCL, or Voltage contribution.
- Each layer renders a continuous additive heat field around retiring nodes. SCL uses a tight red-orange gradient with an assumed ~30 km spread, Voltage uses a blue gradient with ~60 km spread, and Inertia uses a broader teal gradient with ~100 km spread. Darker colour means greater relative screening intensity within the selected layer; colours are not comparable between layers.
- Clickable centre markers remain above the heat field. Their size ranks relative locational importance, combining assumed provision lost and local share lost, rather than representing a physical service radius.
- The overlays label locations as low, moderate, or high screening need. They are technology-assumption screening proxies, not measured inertia, fault level, reactive margin, operational limits, or investment decisions.

The shared baseline covers Great Britain, Northern Ireland, and the Republic of Ireland. Use **Merge CSV** to create a local scenario register without changing that baseline. The CSV must include `asset_id`, `plant_name`, `node_id`, `node_substation`, `country`, `region`, `technology`, `net_mw`, `status`, `latitude`, and `longitude`; retirement, evidence, proxy, and quality-note columns are imported when present.

## Setup

Install Node.js 20.19+ or 22.12+ (the deployment uses Node.js 22). Run all commands from the project folder, not the parent research folder:

```powershell
Set-Location '.\uk-generation-stability-map'
npm ci
npm run dev
```

Vite will display a local address, normally `http://localhost:5173`. If `npm` reports that `package.json` cannot be found, the terminal is in the wrong directory. Create a production bundle and TypeScript-check with:

```powershell
npm run build
```

To preview the production bundle locally, run `npm run preview`. `dist/` is generated output; do not edit it manually or commit hand-modified build files. GitHub Actions builds a fresh Pages artifact with the appropriate repository base path.

## Legacy workbook and coordinate utilities

The current UI does not expose workbook or coordinate-file import. [src/lib/workbook.ts](src/lib/workbook.ts), [src/lib/coordinates.ts](src/lib/coordinates.ts), and [public/plant-coordinates.csv](public/plant-coordinates.csv) are retained legacy utilities and reference data. Do not describe them as active features unless they are reconnected to the interface and tested.

The workbook utility locates header rows rather than relying on fixed Excel row numbers and expects this historic structure:

| Sheet | Fields used |
| --- | --- |
| `PLANT_DATA` | Asset ID, Plant name, Node ID, Node / substation, Region, Technology type, Net MW, Retirement date, Confidence score |
| `CORE_MODEL` | Node ID, Node name, Region, Deficit 2030, Deficit 2040, Deficit 2050, Min confidence |
| `OUTPUTS` | Node, Deficit 2030, Deficit 2040, Deficit 2050, Timing class |

Cells containing `#REF!` are excluded from the legacy risk layer rather than being shown as a numerical deficit. The current map overlays are calculated from plant data in `src/lib/need.ts`, not from workbook risk nodes.

## Coordinates

`public/plant-coordinates.csv` is a supplied coordinate-link reference file. If the legacy coordinate utility is reused, replace approximate values with approved network coordinates before analytical use.

The CSV loader accepts these columns:

```csv
Node ID,Node Name,Plant Name,Latitude,Longitude
NODE-EXAMPLE,Example node,Example plant,52.000,-1.000
```

Matching precedence in the legacy utility is `Node ID`, then plant name, then node name for plants; nodes match `Node ID`, then node name.

## Current screening classification

- Green: local assumed-service loss below 30% (low screening need)
- Amber: local assumed-service loss from 30% to below 70% (moderate screening need)
- Red: local assumed-service loss of at least 70% (high screening need)

For each Node ID, the overlay calculates the assumed technology service of assets retired by the selected horizon divided by the assumed service of all non-archived assets at that node. Technology profiles and their per-MW values are defined in [src/lib/need.ts](src/lib/need.ts). They are transparent screening assumptions, not measured inertia, fault level, reactive margin, or actual capability. The `inertiaProxy`, `faultLevelProxy`, and `reactiveProxy` values in the JSON are not used by the current overlay calculation.

Need-overlay heat radii are visual assumptions: about 30 km for SCL, 60 km for voltage, and 100 km for inertia. Marker size also reflects relative assumed absolute-service loss. Do not compare colours between overlay types or interpret heat radii as physical electrical boundaries.

## Extending the map

[src/models.ts](src/models.ts) contains definitions for potential future Synchronous Condensers, BESS, Substations, AI Data Centres, and Future Opportunity Sites. These are definitions only; they are not currently rendered as separate layers. A future layer needs a governed data source, a coordinate strategy, rendering and filter controls, validation, documentation, and clearly stated analytical assumptions.

## Project layout

```text
.github/workflows/deploy-pages.yml  Builds and deploys GitHub Pages
scripts/build-default-register.mjs  Generates the app register bundle
src/App.tsx                         Register selection, local workspace state, and view selection
src/data/plant-register-2026-07-17.json  Authoritative published register
src/data/default-register.ts        Generated register bundle; do not edit manually
src/components/MapView.tsx          Leaflet map, map markers, overlays, and OpenInfraMap layer
src/components/RegisterView.tsx     Register table and plant editor
src/components/TimelineView.tsx     Retirement timeline
src/components/DataQualityView.tsx  Data-quality checks and edit entry points
src/components/WorkspaceFilters.tsx Shared filter controls
src/lib/workspace.ts                Browser storage, JSON backup validation, CSV merge, and filters
src/lib/need.ts                     Relative screening calculation and technology assumptions
src/lib/risk.ts                     Retirement timing and display helpers
src/lib/workbook.ts                 Legacy workbook import utility, not connected to current UI
src/lib/coordinates.ts              Legacy coordinate utility, not connected to current UI
```

## External services, release checklist, and troubleshooting

The base map uses OpenStreetMap raster tiles. Place search and the Register editor's **Find location** use Nominatim. The optional network layer uses OpenInfraMap vector tiles. These are third-party online services: the register still loads without them, but map tiles, searches, or network information can be unavailable. Do not add API keys to this static client application because visitor browsers can read them.

Before publishing any change, confirm the working tree contains only intended files, regenerate `default-register.ts` when the source JSON changed, run `npm run build`, then test Map, Register, Timeline, Data quality, search, and overlay controls locally. Push to `main`, verify the **Deploy GitHub Pages** workflow succeeds, and hard-refresh the live site.

| Symptom | Cause and action |
| --- | --- |
| Live site does not show new register data | Confirm both the source JSON and generated `default-register.ts` were committed; inspect the latest Pages workflow, then hard-refresh. Local scenarios are separate from the published baseline. |
| `npm` cannot find `package.json` | Run `Set-Location '.\uk-generation-stability-map'` before npm commands. |
| Map, search, or network layer does not load | Check network access and the relevant OpenStreetMap, Nominatim, or OpenInfraMap service. |
| A local scenario disappeared | Browser storage was cleared, the browser/profile changed, or the storage key was deliberately updated. Restore a previously downloaded JSON backup. |
| Users need to share edits | Static GitHub Pages cannot provide shared writes. Review and publish source changes through Git, or design an authenticated backend with validation, access control, audit history, conflict handling, and backups. |