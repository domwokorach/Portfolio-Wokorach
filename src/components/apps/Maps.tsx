import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

type Place = {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  color: string;
};

const PLACES = [
  { id: "1", name: "London, UK", type: "City", lat: 51.5074, lng: -0.1278, color: "#007AFF" },
] satisfies Place[];

type MapStyle = "standard" | "satellite" | "terrain";

type MapViewProps = {
  apiKey: string;
  mapStyle: MapStyle;
  activePlace: Place;
  zoom: number;
  onChangeZoom: (nextZoom: number) => void;
  onChangeMapStyle: (style: MapStyle) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function getGoogleMapType(style: MapStyle) {
  if (style === "satellite") return "k";
  if (style === "terrain") return "p";
  return "m";
}

function getGoogleEmbedMapType(style: MapStyle) {
  if (style === "satellite") return "satellite";
  if (style === "terrain") return "terrain";
  return "roadmap";
}

function buildGoogleEmbedUrl(place: Place, zoom: number, mapStyle: MapStyle, apiKey: string, useEmbedApiKey: boolean) {
  if (!apiKey.trim() || !useEmbedApiKey) {
    const fallback = new URLSearchParams({
      q: `${place.lat},${place.lng}`,
      z: String(clamp(zoom, 3, 20)),
      output: "embed",
      t: getGoogleMapType(mapStyle),
    });

    return `https://maps.google.com/maps?${fallback.toString()}`;
  }

  const params = new URLSearchParams({
    key: apiKey,
    q: `${place.lat},${place.lng}`,
    zoom: String(clamp(zoom, 3, 20)),
    maptype: getGoogleEmbedMapType(mapStyle),
  });

  return `https://www.google.com/maps/embed/v1/place?${params.toString()}`;
}

function MapView({ apiKey, mapStyle, activePlace, zoom, onChangeZoom, onChangeMapStyle }: MapViewProps) {
  const useEmbedApiKey = !import.meta.env.DEV;
  const mapUrl = buildGoogleEmbedUrl(activePlace, zoom, mapStyle, apiKey, useEmbedApiKey);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#d4dde3",
          position: "relative",
        }}
      >
        <iframe
          title="Google Maps"
          src={mapUrl}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />

        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            background: "rgba(255,255,255,0.92)",
            borderRadius: "10px",
            padding: "5px 9px",
            fontSize: "11px",
            color: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
            zIndex: 400,
          }}
        >
          Interactive Google Maps
        </div>
        {!apiKey.trim() && useEmbedApiKey && (
          <div
            style={{
              position: "absolute",
              top: 40,
              left: 10,
              background: "rgba(255,149,0,0.95)",
              color: "#1c1c1e",
              borderRadius: "10px",
              padding: "6px 9px",
              fontSize: "11px",
              fontWeight: 600,
              zIndex: 400,
              boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
            }}
          >
            Add VITE_GOOGLE_MAPS_API_KEY to .env for official Google Maps Embed API.
          </div>
        )}

        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            display: "flex",
            gap: "4px",
            background: "rgba(255,255,255,0.9)",
            borderRadius: "10px",
            padding: "3px",
            backdropFilter: "blur(10px)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            zIndex: 400,
          }}
        >
          {(["standard", "satellite", "terrain"] as const).map((s) => (
            <button
              key={s}
              onClick={() => onChangeMapStyle(s)}
              style={{
                background: mapStyle === s ? "#007AFF" : "transparent",
                border: "none",
                borderRadius: "7px",
                padding: "4px 8px",
                fontSize: "10px",
                cursor: "pointer",
                color: mapStyle === s ? "white" : "#1c1c1e",
                fontWeight: mapStyle === s ? 600 : 400,
                transition: "all 0.15s ease",
              }}
            >
              {s}
            </button>
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 80,
            right: 12,
            display: "flex",
            flexDirection: "column",
            background: "rgba(255,255,255,0.9)",
            borderRadius: "10px",
            overflow: "hidden",
            backdropFilter: "blur(10px)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
            zIndex: 400,
          }}
        >
          {(["+", "−"] as const).map((btn) => (
            <button
              key={btn}
              onClick={() => onChangeZoom(btn === "+" ? zoom + 1 : zoom - 1)}
              style={{
                background: "transparent",
                border: "none",
                width: 32,
                height: 32,
                cursor: "pointer",
                fontSize: "18px",
                color: "#1c1c1e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderBottom: btn === "+" ? "0.5px solid rgba(0,0,0,0.1)" : "none",
              }}
            >
              {btn}
            </button>
          ))}
        </div>

        {/* Active place card */}
        <motion.div
          key={activePlace.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            right: 52,
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(20px)",
            borderRadius: "14px",
            padding: "12px 14px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 400,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: activePlace.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span className="i-ph:map-pin" style={{ width: "18px", height: "18px", color: "white" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#1c1c1e" }}>{activePlace.name}</div>
            <div style={{ fontSize: "11px", color: "rgba(0,0,0,0.5)" }}>{activePlace.type} · London, United Kingdom</div>
          </div>
          <button
            style={{
              background: "#007AFF",
              border: "none",
              borderRadius: "8px",
              padding: "6px 12px",
              fontSize: "12px",
              color: "white",
              cursor: "pointer",
              flexShrink: 0,
            }}
            onClick={() => {
              const destination = `https://www.google.com/maps/dir/?api=1&destination=${activePlace.lat},${activePlace.lng}`;
              window.open(destination, "_blank", "noopener,noreferrer");
            }}
          >
            Directions
          </button>
        </motion.div>
      </div>
    </div>
  );
}

function placeFromNominatim(result: {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
}) {
  const palette = ["#007AFF", "#FF9500", "#FF3B30", "#AF52DE", "#34C759", "#5AC8FA"];
  const color = palette[result.place_id % palette.length];

  return {
    id: String(result.place_id),
    name: result.display_name,
    type: result.type ? result.type[0].toUpperCase() + result.type.slice(1) : "Place",
    lat: Number(result.lat),
    lng: Number(result.lon),
    color,
  } satisfies Place;
}

export default function Maps() {
  const [search, setSearch] = useState("");
  const [activePlace, setActivePlace] = useState(PLACES[0]);
  const [mapStyle, setMapStyle] = useState<MapStyle>("standard");
  const [zoom, setZoom] = useState(13);
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const query = search.trim();

    if (query.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setIsSearching(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&q=${encodeURIComponent(query)}`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Search failed with status ${response.status}`);
        }

        const payload = (await response.json()) as Array<{
          place_id: number;
          display_name: string;
          lat: string;
          lon: string;
          type?: string;
        }>;

        const nextResults = payload.map(placeFromNominatim);
        setSearchResults(nextResults);

        if (nextResults.length > 0) {
          setActivePlace(nextResults[0]);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("[maps] Failed to search OpenStreetMap", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [search]);

  const hasSearchQuery = search.trim().length >= 2;
  const filtered = hasSearchQuery
    ? searchResults
    : PLACES;

  return (
    <div
      style={{
        display: "flex",
        height: "100%",

        background: "#e8e8e0",
        borderRadius: "0 0 14px 14px",
        overflow: "hidden",
      }}
    >
      {/* Sidebar */}
      <div
        style={{
          width: "220px",
          flexShrink: 0,
          background: "rgba(248,248,250,0.98)",
          borderRight: "0.5px solid rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Search */}
        <div style={{ padding: "10px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(0,0,0,0.07)",
              borderRadius: "10px",
              padding: "7px 10px",
            }}
          >
            <span className="i-ph:magnifying-glass" style={{ width: "12px", height: "12px", opacity: 0.5 }} />
            <input
              placeholder="Search Maps"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: "none",
                border: "none",
                outline: "none",
                fontSize: "13px",
                width: "100%",
                color: "#1c1c1e",
              }}
            />
          </div>
        </div>

        {/* Favourites */}
        <div
          style={{
            fontSize: "10px",
            fontWeight: 700,
            color: "rgba(0,0,0,0.35)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            padding: "4px 14px 4px",
          }}
        >
          {hasSearchQuery ? "Search Results" : "Favourites"}
        </div>
        {isSearching && (
          <div
            style={{
              fontSize: "11px",
              color: "rgba(0,0,0,0.45)",
              padding: "4px 14px",
            }}
          >
            Searching OpenStreetMap...
          </div>
        )}
        {!isSearching && hasSearchQuery && filtered.length === 0 && (
          <div
            style={{
              fontSize: "11px",
              color: "rgba(0,0,0,0.45)",
              padding: "4px 14px",
            }}
          >
            No places found.
          </div>
        )}
        {filtered.map((place) => (
          <button
            key={place.id}
            onClick={() => setActivePlace(place)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 12px",
              background: activePlace.id === place.id ? "rgba(0,122,255,0.1)" : "transparent",
              border: "none",
              cursor: "pointer",
              borderRadius: "8px",
              margin: "1px 6px",
              width: "calc(100% - 12px)",
              transition: "background 0.15s ease",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: place.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span className="i-ph:map-pin" style={{ width: "14px", height: "14px", color: "white" }} />
            </div>
            <div style={{ textAlign: "left", minWidth: 0 }}>
              <div
                style={{
                  fontSize: "13px",
                  color: activePlace.id === place.id ? "#007AFF" : "#1c1c1e",
                  fontWeight: activePlace.id === place.id ? 600 : 400,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {place.name}
              </div>
              <div style={{ fontSize: "11px", color: "rgba(0,0,0,0.4)" }}>{place.type}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: "relative" }}>
        <MapView
          apiKey={GOOGLE_MAPS_API_KEY}
          mapStyle={mapStyle}
          activePlace={activePlace}
          zoom={zoom}
          onChangeZoom={(next) => setZoom(clamp(next, 3, 18))}
          onChangeMapStyle={setMapStyle}
        />
      </div>
    </div>
  );
}
