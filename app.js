const DATA_URL = "data/facilities.json";
const LOGO_URL = "data/account-logos.json";
const PALETTE = ["#0067a8", "#f15a24", "#00a7d3", "#6f2c91", "#658d1b", "#c83e4d", "#1d7874", "#a65f00", "#4656a6", "#8b5e3c"];

const state = { facilities: [], filtered: [], logos: {}, accountColors: new Map(), map: null };
const filterKeys = {
  verticalFilter: "vertical",
  parentFilter: "ultimateParent",
  entityFilter: "operatingEntity",
  typeFilter: "facilityType",
  countryFilter: "country",
  aceFilter: "ace"
};

const byId = (id) => document.getElementById(id);
const value = (item, key) => item[key] ?? "";
const unique = (items, key) => [...new Set(items.map((item) => value(item, key)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
const initials = (name) => (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
const escapeHtml = (text) => String(text ?? "").replace(/[&<>'"]/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[character]));

function colorFor(parent) {
  return state.accountColors.get(parent) || PALETTE[0];
}

function buildOptions() {
  Object.entries(filterKeys).forEach(([id, key]) => {
    const select = byId(id);
    unique(state.facilities, key).forEach((entry) => select.add(new Option(entry, entry)));
    select.addEventListener("change", applyFilters);
  });
}

function assignColors() {
  unique(state.facilities, "ultimateParent").forEach((parent, index) => {
    state.accountColors.set(parent, PALETTE[index % PALETTE.length]);
  });
}

function renderLegend() {
  const counts = new Map(), groups = new Map();
  state.filtered.forEach((facility) => {
    counts.set(facility.ultimateParent, (counts.get(facility.ultimateParent) || 0) + 1);
    const vertical = facility.vertical || "Other";
    if (!groups.has(vertical)) groups.set(vertical, new Set());
    groups.get(vertical).add(facility.ultimateParent);
  });
  const parents = [...counts.keys()];
  byId("accountCount").textContent = `${parents.length} ${parents.length === 1 ? "Company" : "Companies"}`;
  byId("legendFacilityCount").textContent = `${state.filtered.length} Facilities`;
  const selectedVertical = byId("verticalFilter").value;
  byId("legendVertical").textContent = selectedVertical || "All Strategic Accounts";
  const legend = byId("accountLegend");
  legend.replaceChildren();
  groups.forEach((parentSet, vertical) => {
    if (!selectedVertical) {
      const heading = document.createElement("div");
      heading.className = "vertical-heading";
      const groupTotal = state.filtered.filter((item) => (item.vertical || "Other") === vertical).length;
      heading.innerHTML = `<strong>${escapeHtml(vertical)}</strong><span>${groupTotal}</span>`;
      legend.append(heading);
    }
    [...parentSet].sort((a, b) => a.localeCompare(b)).forEach((parent) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `account-item${byId("parentFilter").value === parent ? " active" : ""}`;
    const logo = state.logos[parent];
    button.innerHTML = logo
      ? `<img class="account-logo" src="${escapeHtml(logo)}" alt="${escapeHtml(parent)} logo"><span class="account-label"><span class="account-dot" style="background:${colorFor(parent)}"></span>${escapeHtml(parent)}</span><span class="account-total">${counts.get(parent)}</span>`
      : `<span class="account-logo" aria-hidden="true">${escapeHtml(initials(parent))}</span><span class="account-label"><span class="account-dot" style="background:${colorFor(parent)}"></span>${escapeHtml(parent)}</span><span class="account-total">${counts.get(parent)}</span>`;
    button.setAttribute("aria-label", `Filter to ${parent}`);
    const image = button.querySelector("img");
    if (image) image.addEventListener("error", () => {
      const fallback = document.createElement("span");
      fallback.className = "account-logo";
      fallback.setAttribute("aria-hidden", "true");
      fallback.textContent = initials(parent);
      image.replaceWith(fallback);
    }, { once: true });
    button.addEventListener("click", () => {
      const mappedForAccount = state.facilities.filter((item) => item.ultimateParent === parent && item.mapped).length;
      if (!mappedForAccount) {
        byId("mapStatus").textContent = `${counts.get(parent)} ${parent} facilities are in Excel, but none has supplied latitude/longitude. The current map remains visible.`;
        byId("mapStatus").classList.add("map-status-warning");
        return;
      }
      byId("mapStatus").classList.remove("map-status-warning");
      byId("parentFilter").value = byId("parentFilter").value === parent ? "" : parent;
      applyFilters();
    });
    legend.append(button);
    });
  });
}

function asGeoJson(items) {
  return {
    type: "FeatureCollection",
    features: items.filter((item) => item.mapped).map((item) => ({
      type: "Feature",
      id: item.id,
      geometry: { type: "Point", coordinates: [item.longitude, item.latitude] },
      properties: { ...item, color: colorFor(item.ultimateParent) }
    }))
  };
}

function updateMap() {
  if (!state.map?.getSource("facilities")) return;
  const geojson = asGeoJson(state.filtered);
  state.map.getSource("facilities").setData(geojson);
  if (geojson.features.length) {
    const bounds = geojson.features.reduce((result, feature) => result.extend(feature.geometry.coordinates), new maplibregl.LngLatBounds(geojson.features[0].geometry.coordinates, geojson.features[0].geometry.coordinates));
    state.map.fitBounds(bounds, { padding: 72, maxZoom: 9, duration: 600 });
  }
}

function updateKpis() {
  const mapped = state.filtered.filter((facility) => facility.mapped).length;
  byId("kpiFacilities").textContent = state.filtered.length.toLocaleString();
  byId("kpiMapped").textContent = mapped.toLocaleString();
  byId("kpiAccounts").textContent = unique(state.filtered, "ultimateParent").length.toLocaleString();
  byId("kpiCountries").textContent = unique(state.filtered, "country").length.toLocaleString();
  const active = Object.keys(filterKeys).filter((id) => byId(id).value).length;
  byId("activeFilterCount").textContent = active ? `${active} active` : "All records";
  byId("mapStatus").textContent = `${mapped.toLocaleString()} mapped of ${state.filtered.length.toLocaleString()} filtered facilities · Rows without supplied coordinates are not plotted`;
  byId("headerSummary").textContent = `${state.filtered.length.toLocaleString()} Facilities Across ${unique(state.filtered, "ultimateParent").length.toLocaleString()} Strategic Accounts`;
}

function applyFilters() {
  byId("mapStatus").classList.remove("map-status-warning");
  state.filtered = state.facilities.filter((facility) => Object.entries(filterKeys).every(([id, key]) => !byId(id).value || value(facility, key) === byId(id).value));
  updateKpis();
  renderLegend();
  updateMap();
  byId("detailsPanel").hidden = true;
}

function showDetails(item) {
  byId("detailVertical").textContent = item.vertical || "Facility";
  byId("detailName").textContent = item.facilityName || item.operatingEntity || "Unnamed facility";
  const address = [item.streetAddress, item.city, item.stateProvince, item.postalCode, item.country].filter(Boolean).join(", ");
  const fields = [
    ["Ultimate parent", item.ultimateParent],
    ["Operating / bottler entity", item.operatingEntity],
    ["Facility type", item.facilityType],
    ["Address", address],
    ["ACE", item.ace],
    ["Verification", item.verificationStatus],
    ["Research notes", item.researchNotes]
  ];
  byId("detailList").innerHTML = fields.filter(([, fieldValue]) => fieldValue).map(([label, fieldValue]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(fieldValue)}</dd>`).join("");
  const source = byId("detailSource");
  source.hidden = !item.sourceUrl;
  if (item.sourceUrl) source.href = item.sourceUrl;
  byId("detailsPanel").hidden = false;
}

function initializeMap() {
  state.map = new maplibregl.Map({
    container: "map",
    style: "https://tiles.openfreemap.org/styles/liberty",
    center: [-96, 38],
    zoom: 3.2,
    attributionControl: true
  });
  state.map.addControl(new maplibregl.NavigationControl(), "top-right");
  state.map.addControl(new maplibregl.FullscreenControl(), "top-right");
  state.map.on("load", () => {
    state.map.addSource("facilities", { type: "geojson", data: asGeoJson(state.filtered) });
    state.map.addLayer({ id: "facility-pins", type: "circle", source: "facilities", paint: { "circle-color": ["get", "color"], "circle-radius": 8, "circle-stroke-width": 2.5, "circle-stroke-color": "#ffffff" } });
    state.map.on("click", "facility-pins", (event) => showDetails(event.features[0].properties));
    ["facility-pins"].forEach((layer) => {
      state.map.on("mouseenter", layer, () => { state.map.getCanvas().style.cursor = "pointer"; });
      state.map.on("mouseleave", layer, () => { state.map.getCanvas().style.cursor = ""; });
    });
    updateMap();
  });
}

async function start() {
  try {
    const [dataResponse, logosResponse] = await Promise.all([fetch(DATA_URL), fetch(LOGO_URL)]);
    if (!dataResponse.ok) throw new Error(`Facility data failed to load (${dataResponse.status})`);
    const data = await dataResponse.json();
    state.logos = logosResponse.ok ? await logosResponse.json() : {};
    state.facilities = data.facilities || [];
    state.filtered = [...state.facilities];
    assignColors();
    buildOptions();
    initializeMap();
    updateKpis();
    renderLegend();
  } catch (error) {
    byId("mapStatus").textContent = error.message;
    console.error(error);
  }
}

byId("resetFilters").addEventListener("click", () => {
  Object.keys(filterKeys).forEach((id) => { byId(id).value = ""; });
  applyFilters();
});
byId("clearFilters").addEventListener("click", () => byId("resetFilters").click());
byId("closeDetails").addEventListener("click", () => { byId("detailsPanel").hidden = true; });
start();
