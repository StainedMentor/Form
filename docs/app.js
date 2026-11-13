const TRANSITOUS_PLAN_URL = "https://api.transitous.org/api/v5/plan";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const JPKS_API = "https://javniprevozks.ba/api";
const JPKS_PUBLIC_API = "https://javniprevozks.ba/public-api";
const STOP_PREFIX = "ba-Sarajevo-MSKS_";
const SARAJEVO_VIEW = { lat: 43.8563, lon: 18.4131, zoom: 13 };

const VEHICLE_TYPES = {
  1: { id: "1", label: "Minibus", mode: "minibus" },
  2: { id: "2", label: "Autobus", mode: "bus" },
  3: { id: "3", label: "Trolejbus", mode: "trolleybus" },
  4: { id: "4", label: "Tramvaj", mode: "tram" },
};

const DAY_LABELS = {
  1: "Pon",
  2: "Uto",
  3: "Sri",
  4: "Čet",
  5: "Pet",
  6: "Sub",
  7: "Ned",
};

/** @type {Array<{id:string,name:string,lat:number,lon:number}>} */
let stops = [];
/** @type {Array<{id:number,code:string,name:string,vehicleType:string,typeLabel:string,mode:string}>} */
let lines = [];
/** @type {{from: LocationPoint|null, to: LocationPoint|null}} */
const selection = { from: null, to: null };
let activeField = "from";
let activeLineFilter = "all";
let map;
let routeLayer;
let dataSourceLabel = "keš";

const els = {
  fromInput: document.getElementById("from-input"),
  toInput: document.getElementById("to-input"),
  suggestions: document.getElementById("suggestions"),
  searchBtn: document.getElementById("search-btn"),
  swapBtn: document.getElementById("swap-btn"),
  locateBtn: document.getElementById("locate-btn"),
  status: document.getElementById("status"),
  results: document.getElementById("results"),
  routesList: document.getElementById("routes-list"),
  resultsCount: document.getElementById("results-count"),
  mapSection: document.getElementById("map-section"),
  panelPlanner: document.getElementById("panel-planner"),
  panelLines: document.getElementById("panel-lines"),
  panelPose: document.getElementById("panel-pose"),
  poseFrame: document.getElementById("pose-frame"),
  footer: document.querySelector(".footer"),
  linesCard: document.getElementById("lines-card"),
  linesList: document.getElementById("lines-list"),
  linesMeta: document.getElementById("lines-meta"),
  lineSearch: document.getElementById("line-search"),
  typeFilters: document.getElementById("type-filters"),
  timetableCard: document.getElementById("timetable-card"),
  timetableBack: document.getElementById("timetable-back"),
  timetableBadge: document.getElementById("timetable-badge"),
  timetableTitle: document.getElementById("timetable-title"),
  timetableSubtitle: document.getElementById("timetable-subtitle"),
  timetableBody: document.getElementById("timetable-body"),
};

/**
 * @typedef {{ label: string, sublabel?: string, lat: number, lon: number, place: string, stopId?: string }} LocationPoint
 */

init();

async function init() {
  bindEvents();
  await Promise.all([loadStops(), loadLines()]);
}

async function loadStops() {
  try {
    const live = await fetchJson(`${JPKS_API}/public/lines/stations/locations/list`);
    stops = live.map((stop) => ({
      id: String(stop.id),
      name: stop.name,
      lat: Number(stop.latitude),
      lon: Number(stop.longitude),
    }));
    dataSourceLabel = "Javni Prevoz KS";
  } catch (error) {
    console.warn("Live stops failed, using bundled fallback", error);
    try {
      const response = await fetch("./data/stops.json");
      stops = await response.json();
      dataSourceLabel = "keš (offline)";
    } catch (fallbackError) {
      showStatus("Nije moguće učitati listu stajališta.", true);
      console.error(fallbackError);
    }
  }
}

async function loadLines() {
  els.linesMeta.textContent = "Učitavam linije…";
  const collected = [];

  try {
    await Promise.all(
      Object.keys(VEHICLE_TYPES).map(async (typeId) => {
        const routes = await fetchJson(
          `${JPKS_PUBLIC_API}/public/lines/vehicle-type/${typeId}/list`
        );
        const meta = VEHICLE_TYPES[typeId];
        for (const route of routes) {
          collected.push({
            id: route.id,
            code: String(route.code || "").trim(),
            name: route.name,
            vehicleType: typeId,
            typeLabel: meta.label,
            mode: meta.mode,
          });
        }
      })
    );

    lines = collected.sort((a, b) =>
      a.code.localeCompare(b.code, "bs", { numeric: true })
    );
    els.linesMeta.textContent = `${lines.length} linija · ${dataSourceLabel}`;
    renderLinesList();
  } catch (error) {
    console.error(error);
    els.linesMeta.textContent = "Linije trenutno nisu dostupne.";
    els.linesList.innerHTML =
      '<p class="empty">Provjerite vezu i pokušajte ponovo kasnije.</p>';
  }
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => switchTab(tab.dataset.tab));
  });

  els.fromInput.addEventListener("focus", () => {
    activeField = "from";
  });
  els.toInput.addEventListener("focus", () => {
    activeField = "to";
  });

  for (const input of [els.fromInput, els.toInput]) {
    input.addEventListener("input", onInputChanged);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        void searchRoutes();
      }
    });
  }

  els.searchBtn.addEventListener("click", () => void searchRoutes());
  els.swapBtn.addEventListener("click", swapLocations);
  els.locateBtn.addEventListener("click", () => void useCurrentLocation());
  els.lineSearch.addEventListener("input", () => renderLinesList());
  els.timetableBack.addEventListener("click", () => {
    els.timetableCard.hidden = true;
    els.linesCard.hidden = false;
  });

  els.typeFilters.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      activeLineFilter = chip.dataset.type;
      els.typeFilters.querySelectorAll(".chip").forEach((node) => {
        node.classList.toggle("active", node === chip);
      });
      renderLinesList();
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".planner")) {
      hideSuggestions();
    }
  });
}

function switchTab(tabName) {
  const leavingPose = !els.panelPose.hidden && tabName !== "pose";
  els.panelPlanner.hidden = tabName !== "planner";
  els.panelLines.hidden = tabName !== "lines";
  els.panelPose.hidden = tabName !== "pose";

  document.querySelectorAll(".tab").forEach((tab) => {
    const active = tab.dataset.tab === tabName;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  if (tabName === "lines") {
    els.timetableCard.hidden = true;
    els.linesCard.hidden = false;
    renderLinesList();
  }

  if (els.footer) {
    els.footer.hidden = tabName === "pose";
  }

  // Pose Cam is a separate iframe app; reload it when leaving so the camera stops.
  if (leavingPose && els.poseFrame) {
    els.poseFrame.src = "./pose-app/";
  }
}

function renderLinesList() {
  const query = normalize(els.lineSearch.value.trim());
  const filtered = lines.filter((line) => {
    if (activeLineFilter !== "all" && line.vehicleType !== activeLineFilter) {
      return false;
    }
    if (!query) {
      return true;
    }
    return (
      normalize(line.code).includes(query) ||
      normalize(line.name).includes(query) ||
      normalize(line.typeLabel).includes(query)
    );
  });

  if (!filtered.length) {
    els.linesList.innerHTML = '<p class="empty">Nema linija za ovaj filter.</p>';
    return;
  }

  els.linesList.innerHTML = filtered
    .map(
      (line) => `
      <button type="button" class="line-row" data-id="${line.id}">
        <span class="line-badge ${line.mode}">${escapeHtml(line.code)}</span>
        <span class="line-copy">
          <strong>${escapeHtml(line.name)}</strong>
          <span>${escapeHtml(line.typeLabel)}</span>
        </span>
      </button>`
    )
    .join("");

  els.linesList.querySelectorAll(".line-row").forEach((button) => {
    button.addEventListener("click", () => {
      const line = lines.find((item) => String(item.id) === button.dataset.id);
      if (line) {
        void openTimetable(line);
      }
    });
  });
}

async function openTimetable(line) {
  els.linesCard.hidden = true;
  els.timetableCard.hidden = false;
  els.timetableBadge.className = `line-badge ${line.mode}`;
  els.timetableBadge.textContent = line.code;
  els.timetableTitle.textContent = line.name;
  els.timetableSubtitle.textContent = `${line.typeLabel} · učitavam red vožnje…`;
  els.timetableBody.innerHTML = '<p class="empty">Učitavam…</p>';

  try {
    const directions = await fetchJson(
      `${JPKS_API}/public/lines/timetables/${line.id}/list`
    );

    if (!Array.isArray(directions) || !directions.length) {
      els.timetableSubtitle.textContent = line.typeLabel;
      els.timetableBody.innerHTML =
        '<p class="empty">Nema objavljenog reda vožnje za ovu liniju.</p>';
      return;
    }

    els.timetableSubtitle.textContent = `${line.typeLabel} · ${directions.length} smjerova`;
    els.timetableBody.innerHTML = directions
      .map((direction) => {
        const departures = (direction.timetable || [])
          .slice()
          .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));

        const byDayGroup = groupDepartures(departures);
        const groupsHtml = byDayGroup
          .map(
            (group) => `
            <div class="depart-group">
              <div class="depart-days">${escapeHtml(group.days)}</div>
              <div class="depart-times">
                ${group.times
                  .map((time) => `<span class="time-chip">${escapeHtml(time)}</span>`)
                  .join("")}
              </div>
            </div>`
          )
          .join("");

        return `
          <article class="direction-block">
            <h3>${escapeHtml(direction.name || "Smjer")}</h3>
            ${groupsHtml || '<p class="empty">Nema polazaka.</p>'}
          </article>`;
      })
      .join("");
  } catch (error) {
    console.error(error);
    els.timetableSubtitle.textContent = line.typeLabel;
    els.timetableBody.innerHTML =
      '<p class="empty">Red vožnje nije dostupan trenutno.</p>';
  }
}

function groupDepartures(departures) {
  /** @type {Map<string, string[]>} */
  const groups = new Map();

  for (const item of departures) {
    const days = formatDays(item.days_of_week || []);
    const time = formatTime(item.start_time);
    if (!groups.has(days)) {
      groups.set(days, []);
    }
    groups.get(days).push(time);
  }

  return [...groups.entries()].map(([days, times]) => ({ days, times }));
}

function formatDays(days) {
  if (!days.length) {
    return "Svi dani";
  }
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.join(",") === "1,2,3,4,5") {
    return "Radni dani";
  }
  if (sorted.join(",") === "6,7") {
    return "Vikend";
  }
  if (sorted.join(",") === "1,2,3,4,5,6,7") {
    return "Svaki dan";
  }
  return sorted.map((day) => DAY_LABELS[day] || day).join(", ");
}

function formatTime(value) {
  if (!value) {
    return "--:--";
  }
  return String(value).slice(0, 5);
}

function onInputChanged(event) {
  const value = event.target.value.trim();
  const field = event.target.id === "from-input" ? "from" : "to";
  activeField = field;
  selection[field] = null;

  if (value.length < 2) {
    hideSuggestions();
    return;
  }

  void renderSuggestions(value);
}

async function renderSuggestions(query) {
  const local = searchStops(query).slice(0, 8);
  let places = [];

  try {
    places = await geocode(query);
  } catch (error) {
    console.warn("Geocoding failed", error);
  }

  const items = [
    ...local.map((stop) => ({
      type: "Stajalište",
      label: stop.name,
      sublabel: dataSourceLabel,
      lat: stop.lat,
      lon: stop.lon,
      place: formatPlace(stop.lat, stop.lon, stop.id),
      stopId: `${STOP_PREFIX}${stop.id}`,
    })),
    ...places,
  ].slice(0, 10);

  if (!items.length) {
    hideSuggestions();
    return;
  }

  els.suggestions.hidden = false;
  els.suggestions.innerHTML = items
    .map(
      (item, index) => `
      <li>
        <button type="button" data-index="${index}">
          <span class="suggestion-type">${escapeHtml(item.type)}</span>
          <span>
            <span class="suggestion-label">${escapeHtml(item.label)}</span>
            ${item.sublabel ? `<span class="suggestion-sub">${escapeHtml(item.sublabel)}</span>` : ""}
          </span>
        </button>
      </li>`
    )
    .join("");

  els.suggestions.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const item = items[Number(button.dataset.index)];
      applySelection(item);
    });
  });
}

function searchStops(query) {
  const normalized = normalize(query);
  return stops
    .filter((stop) => normalize(stop.name).includes(normalized))
    .sort((a, b) => scoreStop(a, normalized) - scoreStop(b, normalized));
}

function scoreStop(stop, normalized) {
  const name = normalize(stop.name);
  if (name === normalized) return 0;
  if (name.startsWith(normalized)) return 1;
  return 2;
}

async function geocode(query) {
  const params = new URLSearchParams({
    q: `${query}, Sarajevo`,
    format: "json",
    limit: "5",
    countrycodes: "ba",
    addressdetails: "1",
  });

  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("Geocoder unavailable");
  }

  const results = await response.json();
  return results.map((item) => ({
    type: "Adresa",
    label: item.display_name.split(",").slice(0, 2).join(", "),
    sublabel: item.display_name,
    lat: Number(item.lat),
    lon: Number(item.lon),
    place: `${item.lat},${item.lon}`,
  }));
}

function applySelection(item) {
  /** @type {LocationPoint} */
  const point = {
    label: item.label,
    sublabel: item.sublabel,
    lat: item.lat,
    lon: item.lon,
    place: item.place,
    stopId: item.stopId,
  };

  selection[activeField] = point;
  const input = activeField === "from" ? els.fromInput : els.toInput;
  input.value = point.label;
  hideSuggestions();
}

function hideSuggestions() {
  els.suggestions.hidden = true;
  els.suggestions.innerHTML = "";
}

function swapLocations() {
  [selection.from, selection.to] = [selection.to, selection.from];
  [els.fromInput.value, els.toInput.value] = [els.toInput.value, els.fromInput.value];
}

async function useCurrentLocation() {
  if (!navigator.geolocation) {
    showStatus("Vaš uređaj ne podržava GPS lokaciju.", true);
    return;
  }

  showStatus("Tražim vašu lokaciju…");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      selection.from = {
        label: "Moja lokacija",
        lat: latitude,
        lon: longitude,
        place: `${latitude},${longitude}`,
      };
      els.fromInput.value = selection.from.label;
      clearStatus();
    },
    () => {
      showStatus("Lokacija nije dostupna. Dozvolite pristup GPS-u.", true);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

async function searchRoutes() {
  await resolveFreeText("from", els.fromInput.value);
  await resolveFreeText("to", els.toInput.value);

  if (!selection.from || !selection.to) {
    showStatus("Odaberite polazište i odredište iz liste prijedloga.", true);
    return;
  }

  setLoading(true);
  showStatus("Tražim najbolje rute…");
  els.results.hidden = true;
  els.mapSection.hidden = true;

  try {
    const params = new URLSearchParams({
      fromPlace: selection.from.stopId || selection.from.place,
      toPlace: selection.to.stopId || selection.to.place,
      numItineraries: "4",
    });

    const response = await fetch(`${TRANSITOUS_PLAN_URL}?${params}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Rutiranje nije uspjelo.");
    }

    if (!data.itineraries?.length) {
      showStatus(
        "Nema pronađenih ruta za odabrane lokacije. Pokušajte obližnja stajališta.",
        true
      );
      return;
    }

    clearStatus();
    renderResults(data.itineraries);
  } catch (error) {
    showStatus(error.message || "Došlo je do greške pri pretrazi ruta.", true);
    console.error(error);
  } finally {
    setLoading(false);
  }
}

async function resolveFreeText(field, value) {
  if (selection[field] || !value.trim()) {
    return;
  }

  activeField = field;
  const local = searchStops(value);
  if (local.length) {
    const stop = local[0];
    selection[field] = {
      label: stop.name,
      lat: stop.lat,
      lon: stop.lon,
      place: formatPlace(stop.lat, stop.lon, stop.id),
      stopId: `${STOP_PREFIX}${stop.id}`,
    };
    return;
  }

  const places = await geocode(value);
  if (places.length) {
    selection[field] = places[0];
  }
}

function renderResults(itineraries) {
  els.results.hidden = false;
  els.resultsCount.textContent = `${itineraries.length} opcija`;

  els.routesList.innerHTML = itineraries
    .map((itinerary, index) => renderRouteCard(itinerary, index))
    .join("");

  els.routesList.querySelectorAll(".route-option").forEach((card) => {
    card.addEventListener("click", () => {
      els.routesList.querySelectorAll(".route-option").forEach((node) => {
        node.classList.remove("selected");
      });
      card.classList.add("selected");
      const itinerary = itineraries[Number(card.dataset.index)];
      showItineraryOnMap(itinerary);
    });
  });

  const firstCard = els.routesList.querySelector(".route-option");
  if (firstCard) {
    firstCard.classList.add("selected");
    showItineraryOnMap(itineraries[0]);
  }
}

function renderRouteCard(itinerary, index) {
  const chips = itinerary.legs
    .map((leg) => {
      if (leg.mode === "WALK") {
        return `<span class="leg-chip walk">Pješke ${formatDuration(leg.duration)}</span>`;
      }
      const mode = (leg.mode || "TRANSIT").toLowerCase();
      const line = leg.routeShortName || leg.route || leg.mode;
      return `<span class="leg-chip ${mode}">${escapeHtml(String(line))}</span>`;
    })
    .join("");

  const steps = itinerary.legs
    .map((leg) => {
      const start = formatClock(leg.startTime);
      const title =
        leg.mode === "WALK"
          ? `Pješke do ${leg.to.name}`
          : `${leg.routeShortName || leg.route || leg.mode} → ${leg.headsign || leg.to.name}`;
      const detail =
        leg.mode === "WALK"
          ? `${Math.round(leg.distance || 0)} m`
          : `${leg.from.name} → ${leg.to.name}`;
      return `
        <div class="step-row">
          <div class="step-time">${start}</div>
          <div class="step-body">
            <strong>${escapeHtml(title)}</strong>
            <span>${escapeHtml(detail)}</span>
          </div>
        </div>`;
    })
    .join("");

  return `
    <article class="route-option" data-index="${index}">
      <div class="route-summary">
        <div class="route-duration">${formatDuration(itinerary.duration)}</div>
        <div class="route-meta">
          ${itinerary.transfers} presjedanja<br />
          ${formatClock(itinerary.startTime)} – ${formatClock(itinerary.endTime)}
        </div>
      </div>
      <div class="route-legs">${chips}</div>
      <div class="route-detail">${steps}</div>
    </article>`;
}

function showItineraryOnMap(itinerary) {
  els.mapSection.hidden = false;

  if (!map) {
    map = L.map("map", { zoomControl: false }).setView(
      [SARAJEVO_VIEW.lat, SARAJEVO_VIEW.lon],
      SARAJEVO_VIEW.zoom
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
  }

  if (routeLayer) {
    routeLayer.remove();
  }

  const layers = [];
  const bounds = [];

  for (const leg of itinerary.legs) {
    if (leg.legGeometry?.points) {
      const latlngs = decodePolyline(leg.legGeometry.points, leg.legGeometry.precision || 6);
      const color = leg.mode === "WALK" ? "#64748b" : modeColor(leg.mode);
      const line = L.polyline(latlngs, {
        color,
        weight: leg.mode === "WALK" ? 4 : 6,
        opacity: 0.9,
        dashArray: leg.mode === "WALK" ? "6 8" : null,
      });
      layers.push(line);
      latlngs.forEach((point) => bounds.push(point));
    }

    if (leg.from?.lat && leg.from?.lon) {
      bounds.push([leg.from.lat, leg.from.lon]);
    }
    if (leg.to?.lat && leg.to?.lon) {
      bounds.push([leg.to.lat, leg.to.lon]);
    }
  }

  if (selection.from) {
    layers.push(
      L.circleMarker([selection.from.lat, selection.from.lon], {
        radius: 7,
        color: "#22c55e",
        fillColor: "#22c55e",
        fillOpacity: 1,
      })
    );
  }
  if (selection.to) {
    layers.push(
      L.circleMarker([selection.to.lat, selection.to.lon], {
        radius: 7,
        color: "#ef4444",
        fillColor: "#ef4444",
        fillOpacity: 1,
      })
    );
  }

  routeLayer = L.featureGroup(layers).addTo(map);
  if (bounds.length) {
    map.fitBounds(bounds, { padding: [24, 24] });
  }

  setTimeout(() => map.invalidateSize(), 150);
}

function modeColor(mode) {
  switch (mode) {
    case "TRAM":
      return "#0b5fff";
    case "BUS":
      return "#f59e0b";
    case "TROLLEYBUS":
      return "#16a34a";
    default:
      return "#7c3aed";
  }
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} h ${rest} min`;
}

function formatClock(isoString) {
  return new Intl.DateTimeFormat("bs-BA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Sarajevo",
  }).format(new Date(isoString));
}

function formatPlace(lat, lon, stopId) {
  return stopId ? `${STOP_PREFIX}${stopId}` : `${lat},${lon}`;
}

function normalize(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[čć]/g, "c")
    .replace(/[š]/g, "s")
    .replace(/[ž]/g, "z")
    .replace(/[đ]/g, "dj");
}

function decodePolyline(encoded, precision = 6) {
  const factor = 10 ** precision;
  let index = 0;
  let lat = 0;
  let lon = 0;
  const coordinates = [];

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLon = result & 1 ? ~(result >> 1) : result >> 1;
    lon += deltaLon;

    coordinates.push([lat / factor, lon / factor]);
  }

  return coordinates;
}

function showStatus(message, isError = false) {
  els.status.hidden = false;
  els.status.textContent = message;
  els.status.classList.toggle("error", isError);
}

function clearStatus() {
  els.status.hidden = true;
  els.status.textContent = "";
  els.status.classList.remove("error");
}

function setLoading(isLoading) {
  els.searchBtn.disabled = isLoading;
  els.searchBtn.textContent = isLoading ? "Tražim…" : "Pronađi rutu";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
