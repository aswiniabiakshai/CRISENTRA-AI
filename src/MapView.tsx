import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MarkerPoint {
  lat: number;
  lng: number;
  label: string;
  incidentId?: string;
  priority?: string;
  disaster?: string;
  needs?: string;
  status?: string;
}

export interface MapIncident {
  id: string;
  disaster?: string;
  type?: string;
  location?: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  priority?: string;
  need?: string;
  specificNeed?: string;
  specificNeeds?: string[];
  status?: string;
}

// Known location coordinates fallback for Indian cities/disaster zones
const KNOWN_COORDS: Record<string, [number, number]> = {
  chennai: [13.0827, 80.2707],
  conoor: [11.353, 76.7959],
  coonoor: [11.353, 76.7959],
  cumbum: [9.7339, 77.2811],
  coimbatore: [11.0168, 76.9558],
  madurai: [9.9252, 78.1198],
  tirunelveli: [8.7139, 77.7567],
  salem: [11.6643, 78.146],
  kanyakumari: [8.0883, 77.5385],
  nilgiris: [11.4916, 76.7337],
  ooty: [11.4102, 76.695],
  mumbai: [19.076, 72.8777],
  kerala: [10.8505, 76.2711],
  wayanad: [11.6854, 76.132],
  delhi: [28.6139, 77.209],
};

function lookupKnownCoords(query: string): [number, number] | null {
  if (!query) return null;
  const q = query.toLowerCase().trim();
  for (const [key, coords] of Object.entries(KNOWN_COORDS)) {
    if (q.includes(key)) return coords;
  }
  return null;
}

// Geocode via Nominatim with fallback
async function geocode(query: string): Promise<[number, number] | null> {
  const localCoords = lookupKnownCoords(query);
  if (localCoords) return localCoords;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=en`,
      { headers: { "User-Agent": "CRISENTRA-AI/1.0" } }
    );
    const data = await res.json();
    if (data?.[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    return null;
  } catch {
    return null;
  }
}

// Map controller — fly to location when marker changes
function MapController({ point }: { point: MarkerPoint | null }) {
  const map = useMap();
  const prevLabel = useRef<string | null>(null);
  useEffect(() => {
    if (point && point.label !== prevLabel.current) {
      prevLabel.current = point.label;
      map.flyTo([point.lat, point.lng], 13, { duration: 1.5 });
    }
  }, [point, map]);
  return null;
}

interface Props {
  initialLocation?: string;
  selectedIncidentId?: string;
  incidents?: MapIncident[];
  onOpenIncident?: (id: string) => void;
}

export default function GISCommandMap({
  initialLocation,
  selectedIncidentId,
  incidents = [],
  onOpenIncident,
}: Props) {
  const [searchText, setSearchText] = useState("");
  const [marker, setMarker] = useState<MarkerPoint | null>(null);
  const [incidentMarkers, setIncidentMarkers] = useState<MarkerPoint[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Enter a location or select an incident to locate on map");
  const processedLocation = useRef<string | null>(null);

  // Load markers for persisted incidents
  useEffect(() => {
    let cancelled = false;

    async function placeIncidents() {
      const markers: MarkerPoint[] = [];

      for (const inc of incidents.slice(0, 15)) {
        let lat = inc.lat || inc.latitude;
        let lng = inc.lng || inc.longitude;
        const loc = inc.location || "Assigned Area";

        if (lat == null || lng == null) {
          const coords = lookupKnownCoords(loc);
          if (coords) {
            lat = coords[0];
            lng = coords[1];
          }
        }

        if (lat != null && lng != null) {
          const rawNeeds = inc.specificNeeds || [inc.need || inc.specificNeed];
          const needsStr = Array.isArray(rawNeeds) ? rawNeeds.filter(Boolean).join(", ") : String(rawNeeds || "");

          markers.push({
            lat: Number(lat),
            lng: Number(lng),
            label: `${inc.disaster || inc.type || "Crisis"} - ${loc}`,
            incidentId: inc.id,
            priority: inc.priority || "Standard",
            disaster: inc.disaster || inc.type || "General Emergency",
            needs: needsStr || "Assessment in progress",
            status: inc.status || "PENDING",
          });
        }
      }

      if (!cancelled) {
        setIncidentMarkers(markers);
      }
    }

    placeIncidents();
    return () => { cancelled = true; };
  }, [incidents]);

  // Auto-detect location passed from Analyze Crisis or GPS Confirmed click
  useEffect(() => {
    if (initialLocation && initialLocation !== "Not Detected" && initialLocation !== processedLocation.current) {
      processedLocation.current = initialLocation;
      setSearchText(initialLocation);
      doGeocode(initialLocation);
    }
  }, [initialLocation]);

  async function doGeocode(query: string) {
    setIsSearching(true);
    setError("");
    setStatus(`Locating: ${query}...`);
    const coords = await geocode(query);
    if (coords) {
      setMarker({ lat: coords[0], lng: coords[1], label: query });
      setStatus(`📍 Location confirmed: ${query}`);
    } else {
      setError("Location not found. Try a more specific place name.");
      setStatus("Location detection failed");
    }
    setIsSearching(false);
  }

  function handleSearch() {
    if (!searchText.trim()) return;
    doGeocode(searchText.trim());
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div>
        <h1 className="font-orbitron text-2xl font-bold tracking-widest text-slate-100">
          GIS COMMAND MAP
        </h1>
        <div className="h-px mt-3 bg-gradient-to-r from-cyan-500/50 via-teal-500/20 to-transparent" />
      </div>

      {/* Auto-detected banner */}
      {initialLocation && initialLocation !== "Not Detected" && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          <span>📍</span>
          <span>
            Location confirmed from incident signal: <strong>{initialLocation}</strong>
          </span>
        </div>
      )}

      {/* Search bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 sm:p-3 flex flex-wrap sm:flex-nowrap gap-2 sm:gap-3 items-center">
        <span className="text-slate-500 text-sm flex-shrink-0 hidden sm:inline">📍</span>
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter location or district..."
          className="bg-transparent flex-1 min-w-[160px] px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
        />
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-3.5 py-2 text-xs font-bold rounded-lg bg-teal-400 hover:bg-teal-300 text-slate-950 transition disabled:opacity-60 cursor-pointer"
          >
            {isSearching ? "LOCATING..." : "LOCATE"}
          </button>
          {marker && (
            <button
              onClick={() => {
                setMarker(null);
                setSearchText("");
                processedLocation.current = null;
                setStatus("Enter a location or select an incident to locate on map");
              }}
              className="px-3 py-2 text-xs font-bold rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-400 border border-red-900/80 transition cursor-pointer"
            >
              CLEAR
            </button>
          )}
        </div>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2 px-1">
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            marker ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : isSearching ? "bg-amber-400 animate-ping" : "bg-slate-600"
          }`}
        />
        <span className="text-xs font-semibold text-slate-400 tracking-wide">{error || status}</span>
      </div>

      {/* Map Container */}
      <div
        className="flex-1 rounded-2xl overflow-hidden border border-cyan-500/30"
        style={{ minHeight: "450px", height: "450px" }}
      >
        <MapContainer
          center={[11.5, 78.5]}
          zoom={7}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
          scrollWheelZoom={true}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapController point={marker} />

          {/* Active / Current Geocoded Marker */}
          {marker && (
            <Marker position={[marker.lat, marker.lng]}>
              <Popup>
                <div style={{ fontFamily: "Outfit,sans-serif", fontSize: "13px" }}>
                  <strong className="text-teal-700">📍 {marker.label}</strong>
                  <br />
                  <span style={{ color: "#64748b", fontSize: "11px" }}>
                    Lat: {marker.lat.toFixed(5)}, Lng: {marker.lng.toFixed(5)}
                  </span>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Persistent Incident Markers */}
          {incidentMarkers.map((incMarker) => (
            <Marker
              key={incMarker.incidentId}
              position={[incMarker.lat, incMarker.lng]}
            >
              <Popup>
                <div style={{ fontFamily: "Outfit,sans-serif", fontSize: "12px", minWidth: "180px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <strong style={{ color: "#0f766e" }}>{incMarker.incidentId}</strong>
                    <span style={{
                      fontSize: "10px",
                      fontWeight: "bold",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      background: incMarker.priority?.toLowerCase() === "critical" ? "#fef2f2" : "#f0fdf4",
                      color: incMarker.priority?.toLowerCase() === "critical" ? "#dc2626" : "#16a34a"
                    }}>
                      {incMarker.priority}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: "2px" }}>
                    {incMarker.disaster}
                  </div>
                  <div style={{ color: "#64748b", fontSize: "11px", marginBottom: "4px" }}>
                    {incMarker.label}
                  </div>
                  <div style={{ color: "#0369a1", fontSize: "11px", marginBottom: "8px" }}>
                    Needs: {incMarker.needs}
                  </div>
                  {onOpenIncident && (
                    <button
                      onClick={() => onOpenIncident(incMarker.incidentId!)}
                      style={{
                        width: "100%",
                        padding: "4px 8px",
                        background: "#0d9488",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        fontWeight: 600,
                        fontSize: "11px",
                        cursor: "pointer"
                      }}
                    >
                      OPEN INCIDENT DETAILS
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Coordinates panel */}
      {marker && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 flex-shrink-0">
          {[
            { label: "LATITUDE", value: marker.lat.toFixed(6), color: "#38bdf8" },
            { label: "LONGITUDE", value: marker.lng.toFixed(6), color: "#34d399" },
            { label: "CONFIRMED AREA", value: marker.label, color: "#fbbf24" },
          ].map((c) => (
            <div key={c.label} className="bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3">
              <div className="text-[10px] font-bold tracking-widest text-slate-500 mb-0.5">{c.label}</div>
              <div className="text-xs sm:text-sm font-bold truncate" style={{ color: c.color }}>
                {c.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
