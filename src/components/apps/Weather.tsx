import { useEffect, useState } from "react";

type WeatherKind = "sunny" | "partly-cloudy" | "cloudy" | "moon";

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY as string;
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

type WeatherSnapshot = {
  location: string;
  temp: number;
  condition: string;
  high: number;
  low: number;
  humidity: number;
  wind: number;
  windGust: number;
  windDeg: number;
  feelsLike: number;
  pressure: number;
  visibilityKm: number;
  sunrise: string;
  sunset: string;
  uvIndex: number | null;
  airQuality: number | null;
  icon: WeatherKind;
};

type ForecastSnapshot = {
  hourly: HourlyEntry[];
  daily: ForecastEntry[];
  precipitationTodayMm: number;
  peakRainChance: number;
  peakRainHour: string;
  nextWetDay: string | null;
};

type OwmCurrentResponse = {
  cod: number | string;
  name: string;
  coord: {
    lat: number;
    lon: number;
  };
  main: {
    temp: number;
    temp_max: number;
    temp_min: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  wind: {
    speed: number;
    deg?: number;
    gust?: number;
  };
  visibility?: number;
  sys: {
    sunrise: number;
    sunset: number;
  };
  weather: Array<{
    description: string;
    icon: string;
  }>;
};

type OwmForecastEntry = {
  dt: number;
  dt_txt: string;
  pop: number;
  main: {
    temp: number;
    temp_max: number;
    temp_min: number;
  };
  weather: Array<{
    icon: string;
  }>;
  rain?: {
    "3h"?: number;
  };
  snow?: {
    "3h"?: number;
  };
};

type OwmForecastResponse = {
  cod: string;
  list: OwmForecastEntry[];
};

type OwmAirPollutionResponse = {
  list: Array<{
    main: {
      aqi: number;
    };
  }>;
};

type OwmOneCallResponse = {
  current?: {
    uvi?: number;
  };
};

type CityRow = {
  name: string;
  subtitle: string;
  temp: number;
  high: number;
  low: number;
  condition: string;
  active?: boolean;
};

type HourlyEntry = {
  hour: string;
  temp: number;
  kind: WeatherKind;
};

type ForecastEntry = {
  day: string;
  kind: WeatherKind;
  low: number;
  high: number;
  precipitation?: string;
};

const SIDEBAR_CITIES: CityRow[] = [
  { name: "Hammersmith a...", subtitle: "My Location · Home", temp: 16, high: 25, low: 15, condition: "Mostly Sunny" },
  { name: "Brighton", subtitle: "07:25", temp: 15, high: 23, low: 13, condition: "Mostly Sunny" },
  { name: "Manchester", subtitle: "07:25", temp: 16, high: 25, low: 15, condition: "Partly Cloudy" },
  { name: "London", subtitle: "07:25", temp: 15, high: 25, low: 14, condition: "Mostly Sunny", active: true },
  { name: "Atlanta", subtitle: "02:25", temp: 25, high: 32, low: 23, condition: "Mostly Clear" },
  { name: "Flint", subtitle: "02:25", temp: 22, high: 28, low: 20, condition: "Mostly Clear" },
];

const HERO_HOURLY: HourlyEntry[] = [
  { hour: "Now", temp: 15, kind: "sunny" },
  { hour: "08", temp: 16, kind: "sunny" },
  { hour: "09", temp: 18, kind: "partly-cloudy" },
  { hour: "10", temp: 19, kind: "partly-cloudy" },
  { hour: "11", temp: 21, kind: "partly-cloudy" },
  { hour: "12", temp: 22, kind: "partly-cloudy" },
  { hour: "13", temp: 23, kind: "cloudy" },
  { hour: "14", temp: 24, kind: "cloudy" },
  { hour: "15", temp: 24, kind: "cloudy" },
  { hour: "16", temp: 25, kind: "cloudy" },
  { hour: "17", temp: 25, kind: "cloudy" },
  { hour: "18", temp: 25, kind: "partly-cloudy" },
  { hour: "19", temp: 25, kind: "sunny" },
  { hour: "20", temp: 24, kind: "sunny" },
  { hour: "21", temp: 22, kind: "sunny" },
  { hour: "21:04", temp: 0, kind: "moon" },
  { hour: "22", temp: 21, kind: "moon" },
  { hour: "23", temp: 19, kind: "moon" },
];

const FORECAST: ForecastEntry[] = [
  { day: "Today", kind: "partly-cloudy", low: 14, high: 25, precipitation: "0%" },
  { day: "Wed", kind: "cloudy", low: 16, high: 25, precipitation: "5%" },
  { day: "Thu", kind: "cloudy", low: 15, high: 25, precipitation: "4%" },
  { day: "Fri", kind: "cloudy", low: 16, high: 27, precipitation: "10%" },
  { day: "Sat", kind: "partly-cloudy", low: 17, high: 25, precipitation: "40%" },
  { day: "Sun", kind: "moon", low: 16, high: 24, precipitation: "55%" },
  { day: "Mon", kind: "sunny", low: 15, high: 24, precipitation: "5%" },
  { day: "Tue", kind: "sunny", low: 16, high: 27, precipitation: "0%" },
];

const DEFAULT_WEATHER: WeatherSnapshot = {
  location: "London",
  temp: 15,
  condition: "Mostly Sunny",
  high: 25,
  low: 14,
  humidity: 42,
  wind: 12,
  windGust: 20,
  windDeg: 20,
  feelsLike: 16,
  pressure: 1014,
  visibilityKm: 10,
  sunrise: "05:09",
  sunset: "21:04",
  uvIndex: null,
  airQuality: null,
  icon: "sunny",
};

function owmIconToLocal(icon: string): WeatherKind {
  if (icon.startsWith("01")) return "sunny";
  if (icon.startsWith("09") || icon.startsWith("10")) return "cloudy";
  if (icon.startsWith("02") || icon.startsWith("03") || icon.startsWith("04")) return "partly-cloudy";
  return "moon";
}

function formatWeatherCondition(value: string) {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatClockFromUnix(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function windDirection(deg: number) {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return directions[index];
}

function uvCategory(uvIndex: number | null) {
  if (uvIndex === null) return "Unavailable";
  if (uvIndex < 3) return "Low";
  if (uvIndex < 6) return "Moderate";
  if (uvIndex < 8) return "High";
  if (uvIndex < 11) return "Very High";
  return "Extreme";
}

function airQualityCategory(aqi: number | null) {
  if (aqi === null) return "Unavailable";
  if (aqi === 1) return "Good";
  if (aqi === 2) return "Fair";
  if (aqi === 3) return "Moderate";
  if (aqi === 4) return "Poor";
  return "Very Poor";
}

function isLocalSearch(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === "local" || normalized === "my location" || normalized === "near me" || normalized === "current location";
}

function toHourlyEntries(list: OwmForecastEntry[]): HourlyEntry[] {
  const source = list.slice(0, 18);

  if (source.length === 0) {
    return HERO_HOURLY;
  }

  return source.map((entry, index) => ({
    hour: index === 0 ? "Now" : new Date(entry.dt * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", hour12: false }),
    temp: Math.round(entry.main.temp),
    kind: owmIconToLocal(entry.weather[0]?.icon ?? "01d"),
  }));
}

function toDailyForecast(list: OwmForecastEntry[]): ForecastEntry[] {
  const grouped = new Map<string, OwmForecastEntry[]>();

  for (const entry of list) {
    const key = entry.dt_txt.slice(0, 10);
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(entry);
    } else {
      grouped.set(key, [entry]);
    }
  }

  const keys = Array.from(grouped.keys()).sort().slice(0, 8);

  if (keys.length === 0) {
    return FORECAST;
  }

  return keys.map((key, index) => {
    const dayEntries = grouped.get(key) ?? [];
    const low = Math.round(Math.min(...dayEntries.map((entry) => entry.main.temp_min)));
    const high = Math.round(Math.max(...dayEntries.map((entry) => entry.main.temp_max)));
    const wettest = Math.max(...dayEntries.map((entry) => entry.pop));
    const midday = dayEntries.find((entry) => entry.dt_txt.endsWith("12:00:00")) ?? dayEntries[0];
    const kind = owmIconToLocal(midday?.weather[0]?.icon ?? "01d");

    return {
      day: index === 0 ? "Today" : new Date(`${key}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" }),
      kind,
      low,
      high,
      precipitation: `${Math.round(wettest * 100)}%`,
    };
  });
}

function toForecastInsights(list: OwmForecastEntry[]) {
  if (list.length === 0) {
    return {
      precipitationTodayMm: 0,
      peakRainChance: 0,
      peakRainHour: "Now",
      nextWetDay: null,
    };
  }

  const todayKey = list[0].dt_txt.slice(0, 10);
  const precipitationTodayMm = Number(
    list
      .filter((entry) => entry.dt_txt.slice(0, 10) === todayKey)
      .reduce((total, entry) => total + (entry.rain?.["3h"] ?? 0) + (entry.snow?.["3h"] ?? 0), 0)
      .toFixed(1)
  );

  const upcoming = list.slice(0, 8);
  const peak = upcoming.reduce((best, entry) => {
    if (entry.pop > best.pop) {
      return entry;
    }

    return best;
  }, upcoming[0]);

  const nextWet = list.find((entry) => entry.dt_txt.slice(0, 10) !== todayKey && entry.pop >= 0.35);

  return {
    precipitationTodayMm,
    peakRainChance: Math.round((peak?.pop ?? 0) * 100),
    peakRainHour: peak ? formatClockFromUnix(peak.dt) : "Now",
    nextWetDay: nextWet
      ? new Date(`${nextWet.dt_txt.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" })
      : null,
  };
}

async function fetchAirQualityByCoords(lat: number, lon: number, signal?: AbortSignal): Promise<number | null> {
  const response = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`, { signal });
  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as OwmAirPollutionResponse;
  return json.list?.[0]?.main?.aqi ?? null;
}

async function fetchUvIndexByCoords(lat: number, lon: number, signal?: AbortSignal): Promise<number | null> {
  const response = await fetch(`https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly,daily,alerts&units=metric&appid=${API_KEY}`, { signal });
  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as OwmOneCallResponse;
  const raw = json.current?.uvi;
  if (typeof raw !== "number" || Number.isNaN(raw)) {
    return null;
  }

  return Math.round(raw * 10) / 10;
}

async function enrichExtraMetrics(base: WeatherSnapshot, lat: number, lon: number, signal?: AbortSignal): Promise<WeatherSnapshot> {
  const [airQuality, uvIndex] = await Promise.all([
    fetchAirQualityByCoords(lat, lon, signal),
    fetchUvIndexByCoords(lat, lon, signal),
  ]);

  return {
    ...base,
    airQuality,
    uvIndex,
  };
}

async function fetchWeatherByCity(query: string, signal?: AbortSignal): Promise<WeatherSnapshot | null> {
  const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&units=metric&appid=${API_KEY}`, { signal });
  const json = (await response.json()) as OwmCurrentResponse;

  if (String(json?.cod) !== "200") {
    return null;
  }

  const payload: WeatherSnapshot = {
    location: json.name,
    temp: Math.round(json.main.temp),
    condition: formatWeatherCondition(json.weather[0].description),
    high: Math.round(json.main.temp_max),
    low: Math.round(json.main.temp_min),
    humidity: Math.round(json.main.humidity),
    wind: Math.round(json.wind.speed * 3.6),
    windGust: Math.round((json.wind.gust ?? json.wind.speed) * 3.6),
    windDeg: Math.round(json.wind.deg ?? 0),
    feelsLike: Math.round(json.main.feels_like),
    pressure: Math.round(json.main.pressure),
    visibilityKm: Math.round(((json.visibility ?? 10000) / 1000) * 10) / 10,
    sunrise: formatClockFromUnix(json.sys.sunrise),
    sunset: formatClockFromUnix(json.sys.sunset),
    uvIndex: null,
    airQuality: null,
    icon: owmIconToLocal(json.weather[0].icon),
  };

  return enrichExtraMetrics(payload, json.coord.lat, json.coord.lon, signal);
}

async function fetchWeatherByCoords(lat: number, lon: number, signal?: AbortSignal): Promise<WeatherSnapshot | null> {
  const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`, { signal });
  const json = (await response.json()) as OwmCurrentResponse;

  if (String(json?.cod) !== "200") {
    return null;
  }

  const payload: WeatherSnapshot = {
    location: json.name,
    temp: Math.round(json.main.temp),
    condition: formatWeatherCondition(json.weather[0].description),
    high: Math.round(json.main.temp_max),
    low: Math.round(json.main.temp_min),
    humidity: Math.round(json.main.humidity),
    wind: Math.round(json.wind.speed * 3.6),
    windGust: Math.round((json.wind.gust ?? json.wind.speed) * 3.6),
    windDeg: Math.round(json.wind.deg ?? 0),
    feelsLike: Math.round(json.main.feels_like),
    pressure: Math.round(json.main.pressure),
    visibilityKm: Math.round(((json.visibility ?? 10000) / 1000) * 10) / 10,
    sunrise: formatClockFromUnix(json.sys.sunrise),
    sunset: formatClockFromUnix(json.sys.sunset),
    uvIndex: null,
    airQuality: null,
    icon: owmIconToLocal(json.weather[0].icon),
  };

  return enrichExtraMetrics(payload, lat, lon, signal);
}

async function fetchForecastByCity(query: string, signal?: AbortSignal): Promise<ForecastSnapshot | null> {
  const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(query)}&units=metric&appid=${API_KEY}`, { signal });
  const json = (await response.json()) as OwmForecastResponse;

  if (String(json?.cod) !== "200") {
    return null;
  }

  const insights = toForecastInsights(json.list);

  return {
    hourly: toHourlyEntries(json.list),
    daily: toDailyForecast(json.list),
    precipitationTodayMm: insights.precipitationTodayMm,
    peakRainChance: insights.peakRainChance,
    peakRainHour: insights.peakRainHour,
    nextWetDay: insights.nextWetDay,
  };
}

async function fetchForecastByCoords(lat: number, lon: number, signal?: AbortSignal): Promise<ForecastSnapshot | null> {
  const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`, { signal });
  const json = (await response.json()) as OwmForecastResponse;

  if (String(json?.cod) !== "200") {
    return null;
  }

  const insights = toForecastInsights(json.list);

  return {
    hourly: toHourlyEntries(json.list),
    daily: toDailyForecast(json.list),
    precipitationTodayMm: insights.precipitationTodayMm,
    peakRainChance: insights.peakRainChance,
    peakRainHour: insights.peakRainHour,
    nextWetDay: insights.nextWetDay,
  };
}

function getBrowserLocation() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is unavailable"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 600000,
    });
  });
}

function WeatherIcon({ type, size = 20 }: { type: WeatherKind; size?: number }) {
  if (type === "sunny") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="4.4" fill="#FFD60A" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, index) => (
          <line key={index} x1="12" y1="2.5" x2="12" y2="5" stroke="#FFD60A" strokeWidth="2" strokeLinecap="round" transform={`rotate(${deg} 12 12)`} />
        ))}
      </svg>
    );
  }

  if (type === "moon") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="rgba(225,235,255,0.95)" strokeWidth="1.5" fill="rgba(160,180,255,0.12)" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 15a4.5 4.5 0 1 1 8.8-1H18a2.8 2.8 0 0 1 0 5.6H9a3.4 3.4 0 0 1-1-6.35" stroke="rgba(255,255,255,0.9)" strokeWidth="1.4" fill="rgba(255,255,255,0.15)" />
      {type === "partly-cloudy" && <circle cx="9" cy="8.6" r="3.4" fill="#FFD60A" opacity="0.95" />}
      {type === "partly-cloudy" && [0, 60, 120, 180, 240, 300].map((deg, index) => (
        <line key={index} x1="9" y1="1.5" x2="9" y2="3.2" stroke="#FFD60A" strokeWidth="1.5" strokeLinecap="round" transform={`rotate(${deg} 9 8.6)`} />
      ))}
    </svg>
  );
}

type LeftSidebarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onSelectCity: (city: string) => void;
  loading: boolean;
  liveWeather: WeatherSnapshot;
};

function LeftSidebar({ search, onSearchChange, onSelectCity, loading, liveWeather }: LeftSidebarProps) {
  const [selected, setSelected] = useState("London");
  const trimmedSearch = search.trim();
  const showLiveCard = trimmedSearch.length >= 2 || isLocalSearch(trimmedSearch);

  const liveCityCard: CityRow | null = showLiveCard
    ? {
        name: liveWeather.location,
        subtitle: loading ? "Updating..." : "Live now",
        temp: liveWeather.temp,
        high: liveWeather.high,
        low: liveWeather.low,
        condition: liveWeather.condition,
        active: true,
      }
    : null;

  const filteredCities = SIDEBAR_CITIES.filter((city) => {
    const haystack = `${city.name} ${city.subtitle} ${city.condition}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const sidebarCities = liveCityCard
    ? [liveCityCard, ...filteredCities.filter((city) => city.name.toLowerCase() !== liveCityCard.name.toLowerCase())]
    : filteredCities;

  return (
    <div className="weather-sidebar" style={{ width: 205, minWidth: 205, padding: 10, display: "flex", flexDirection: "column", gap: 10, background: "linear-gradient(180deg, rgba(22,38,59,0.88), rgba(17,29,45,0.84))", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="macos-toolbar" style={{ borderRadius: 14, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8 }}>
        <span className="i-ph:magnifying-glass-bold" style={{ width: 14, height: 14, color: "rgba(255,255,255,0.7)" }} />
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={loading ? "Loading..." : "Search city or local"}
          aria-label="Search weather locations"
          style={{
            width: "100%",
            border: "none",
            outline: "none",
            background: "transparent",
            color: "rgba(255,255,255,0.92)",
            fontSize: 13,
            fontWeight: 600,
          }}
        />
      </div>

      <div style={{ borderRadius: 18, background: "linear-gradient(180deg, rgba(38,51,68,0.95), rgba(27,36,48,0.96))", border: "1px solid rgba(255,255,255,0.08)", padding: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ width: 32, height: 32, borderRadius: 999, background: "rgba(255,255,255,0.14)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            <span className="i-ph:paper-plane-right-fill" style={{ width: 15, height: 15, color: "rgba(255,255,255,0.78)" }} />
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.72)", lineHeight: 1.35, paddingTop: 2 }}>
            <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Home & Work</div>
            Your home and work locations can now be shown in Weather. You can control Weather's access to these addresses in Settings.
          </div>
          <button style={{ border: "none", background: "transparent", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 18, lineHeight: 1, marginLeft: 2 }}>×</button>
        </div>
        <button style={{ width: "100%", marginTop: 12, border: "none", borderRadius: 12, padding: "9px 12px", background: "rgba(255,255,255,0.84)", color: "#26384f", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Go to Settings</button>
      </div>

      <div className="weather-sidebar-cities" style={{ display: "flex", flexDirection: "column", gap: 8, overflow: "auto" }}>
        {sidebarCities.length > 0 ? sidebarCities.map((city) => {
          const active = selected === city.name || city.active;

          return (
            <button
              key={city.name}
              onClick={() => {
                setSelected(city.name);
                onSelectCity(city.name);
              }}
              style={{
                cursor: "pointer",
                textAlign: "left",
                borderRadius: 14,
                padding: 10,
                color: "#fff",
                background: active ? "linear-gradient(180deg, rgba(119,164,214,0.92), rgba(95,140,194,0.92))" : "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))",
                boxShadow: active ? "0 12px 28px rgba(0,0,0,0.18)" : "none",
                border: active ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>{city.name}</div>
                  <div style={{ fontSize: 11, opacity: 0.78, marginTop: 3 }}>{city.subtitle}</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 300, lineHeight: 1 }}>{city.temp}°</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11, color: "rgba(255,255,255,0.78)" }}>
                <span>{city.condition}</span>
                <span>H:{city.high}° L:{city.low}°</span>
              </div>
            </button>
          );
        }) : (
          <div style={{ padding: 12, borderRadius: 14, color: "rgba(255,255,255,0.72)", fontSize: 12, lineHeight: 1.4, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
            No matching locations found.
          </div>
        )}
      </div>
    </div>
  );
}

export default function Weather() {
  const [search, setSearch] = useState("");
  const [weather, setWeather] = useState<WeatherSnapshot>(DEFAULT_WEATHER);
  const [liveHourly, setLiveHourly] = useState<HourlyEntry[]>(HERO_HOURLY);
  const [liveForecast, setLiveForecast] = useState<ForecastEntry[]>(FORECAST);
  const [todayPrecipitationMm, setTodayPrecipitationMm] = useState(0);
  const [peakRainChance, setPeakRainChance] = useState(0);
  const [peakRainHour, setPeakRainHour] = useState("Now");
  const [nextWetDay, setNextWetDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!API_KEY) {
      return;
    }

    const trimmed = search.trim();
    const localMode = isLocalSearch(trimmed);
    const cityQuery = trimmed.length >= 2 ? trimmed : DEFAULT_WEATHER.location;

    const controller = new AbortController();
    const run = async () => {
      try {
        setLoading(true);

        const nextPayload = localMode
          ? await getBrowserLocation().then(async (position) => {
            const [current, forecast] = await Promise.all([
              fetchWeatherByCoords(position.coords.latitude, position.coords.longitude, controller.signal),
              fetchForecastByCoords(position.coords.latitude, position.coords.longitude, controller.signal),
            ]);

            return { current, forecast };
          })
          : await Promise.all([
            fetchWeatherByCity(cityQuery, controller.signal),
            fetchForecastByCity(cityQuery, controller.signal),
          ]).then(([current, forecast]) => ({ current, forecast }));

        if (nextPayload.current) {
          setWeather(nextPayload.current);
        }

        if (nextPayload.forecast) {
          setLiveHourly(nextPayload.forecast.hourly);
          setLiveForecast(nextPayload.forecast.daily);
          setTodayPrecipitationMm(nextPayload.forecast.precipitationTodayMm);
          setPeakRainChance(nextPayload.forecast.peakRainChance);
          setPeakRainHour(nextPayload.forecast.peakRainHour);
          setNextWetDay(nextPayload.forecast.nextWetDay);
        }
      } catch {
        if (!weather.location) {
          setWeather(DEFAULT_WEATHER);
          setLiveHourly(HERO_HOURLY);
          setLiveForecast(FORECAST);
          setTodayPrecipitationMm(0);
          setPeakRainChance(0);
          setPeakRainHour("Now");
          setNextWetDay(null);
        }
      } finally {
        setLoading(false);
      }
    };

    const timeout = window.setTimeout(() => {
      void run();
    }, 350);

    const refresh = window.setInterval(() => {
      void run();
    }, 600000);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
      window.clearInterval(refresh);
    };
  }, [search, weather.location]);

  const activeWeather = weather;
  const activeHourly = liveHourly;
  const activeForecast = liveForecast;
  const activeUvLabel = uvCategory(activeWeather.uvIndex);
  const activeAqiLabel = airQualityCategory(activeWeather.airQuality);
  const rainSummary = peakRainChance > 0
    ? `Rain chance peaks at ${peakRainChance}% around ${peakRainHour}.`
    : `Dry window expected. Wind gusts up to ${activeWeather.windGust} km/h.`;
  const mapQuery = encodeURIComponent(`${activeWeather.location}`);
  const mapZoom = /london/i.test(activeWeather.location) ? 11 : 8;
  const googleMapEmbedSrc = GOOGLE_MAPS_API_KEY
    ? `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${mapQuery}&zoom=${mapZoom}&maptype=roadmap`
    : "";

  return (
    <div className="weather-macos-screen" style={{ height: "100%", padding: 10, overflow: "hidden" }}>
      <div className="weather-shell" style={{ height: "100%", borderRadius: 28, display: "flex", overflow: "hidden" }}>
        <LeftSidebar search={search} onSearchChange={setSearch} onSelectCity={setSearch} loading={loading} liveWeather={activeWeather} />

        <div className="weather-main" style={{ flex: 1, position: "relative", padding: 20, overflow: "auto", background: "linear-gradient(180deg, rgba(97,152,209,0.95), rgba(116,168,219,0.92))" }}>
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 14% 6%, rgba(255,255,255,0.76) 0, rgba(255,255,255,0.26) 5%, transparent 14%), radial-gradient(circle at 35% 15%, rgba(255,255,255,0.14) 0, transparent 10%)" }} />

          <div className="weather-main-inner" style={{ position: "relative", zIndex: 1, maxWidth: 955, margin: "0 auto" }}>
            <div className="weather-hero-head" style={{ textAlign: "center", paddingTop: 2, marginBottom: 18, color: "#fff" }}>
              <div className="weather-hero-location" style={{ fontSize: 28, fontWeight: 500, lineHeight: 1.05 }}>{activeWeather.location}</div>
              <div className="weather-hero-temp" style={{ fontSize: 68, fontWeight: 200, letterSpacing: "-4px", lineHeight: 0.9 }}>{activeWeather.temp}°</div>
              <div className="weather-hero-condition" style={{ fontSize: 18, fontWeight: 500, marginTop: 2 }}>{activeWeather.condition}</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>H:{activeWeather.high}° L:{activeWeather.low}°</div>
            </div>

            <div style={{ borderRadius: 18, padding: "8px 12px 12px", marginBottom: 14, background: "linear-gradient(180deg, rgba(49,122,196,0.84), rgba(48,110,184,0.8))", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}>
              <div style={{ fontSize: 11, opacity: 0.82, marginBottom: 10 }}>{rainSummary}</div>
              <div className="weather-hourly-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(activeHourly.length, 1)}, minmax(0, 1fr))`, gap: 6, alignItems: "end" }}>
                {activeHourly.map((entry) => (
                  <div key={entry.hour} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.88, marginBottom: 10 }}>{entry.hour}</div>
                    <WeatherIcon type={entry.kind} size={18} />
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 10 }}>{entry.temp}°</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="weather-desktop-panels" style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr 1.18fr", gap: 12, alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="tile tile-dark" style={{ padding: 14, minHeight: 250 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, marginBottom: 8 }}>10-DAY FORECAST</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {activeForecast.slice(0, 8).map((entry) => (
                      <div key={entry.day} style={{ display: "grid", gridTemplateColumns: "58px 26px 1fr 42px", gap: 8, alignItems: "center", fontSize: 13 }}>
                        <div style={{ fontWeight: 700 }}>{entry.day}</div>
                        <WeatherIcon type={entry.kind} size={17} />
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: "rgba(255,255,255,0.72)" }}>{entry.low}°</span>
                          <div style={{ position: "relative", height: 4, flex: 1, borderRadius: 999, background: "rgba(255,255,255,0.12)" }}>
                            <div style={{ position: "absolute", left: `${Math.min(84, Math.max(10, entry.low * 4))}%`, width: `${Math.max(12, (entry.high - entry.low) * 5)}%`, height: 4, borderRadius: 999, background: "linear-gradient(90deg, #ffd150, #ffbf35, #ff9b2f)" }} />
                          </div>
                          <span style={{ color: "rgba(255,255,255,0.72)" }}>{entry.high}°</span>
                        </div>
                        <div style={{ textAlign: "right", color: "rgba(255,255,255,0.72)" }}>{entry.precipitation}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="tile tile-dark" style={{ padding: 14, minHeight: 140 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, marginBottom: 10 }}>UV INDEX</div>
                  <div style={{ fontSize: 30, fontWeight: 200, lineHeight: 1 }}>{activeWeather.uvIndex ?? "--"}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{activeUvLabel}</div>
                  <div style={{ height: 4, borderRadius: 999, marginTop: 14, background: "linear-gradient(90deg, #50d17c, #ffd150, #ff9b2f, #ff3b30, #d02dff)" }} />
                  <div style={{ marginTop: 10, fontSize: 11, lineHeight: 1.4, opacity: 0.82 }}>Pressure {activeWeather.pressure} hPa · Visibility {activeWeather.visibilityKm} km.</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="tile tile-dark" style={{ padding: 14, minHeight: 180 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, marginBottom: 10 }}>AIR POLLUTION</div>
                  <div style={{ fontSize: 30, fontWeight: 300, lineHeight: 1 }}>{activeWeather.airQuality ?? "--"}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{activeAqiLabel}</div>
                  <div style={{ height: 4, borderRadius: 999, marginTop: 16, background: "linear-gradient(90deg, #50d17c 0%, #ffd150 25%, #ff9b2f 55%, #ff3b30 80%, #d02dff 100%)" }} />
                  <div style={{ marginTop: 10, fontSize: 11, lineHeight: 1.45, opacity: 0.82 }}>Live AQI from OpenWeather air pollution endpoint.</div>
                </div>

                <div className="tile tile-dark" style={{ padding: 14, minHeight: 190 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, marginBottom: 10 }}>WIND</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12, color: "rgba(255,255,255,0.82)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>Wind</span><span>{activeWeather.wind} km/h</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>Gusts</span><span>{activeWeather.windGust} km/h</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span>Direction</span><span>{activeWeather.windDeg}° {windDirection(activeWeather.windDeg)}</span></div>
                    </div>
                    <div style={{ width: 84, height: 84, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.14)", position: "relative", display: "grid", placeItems: "center" }}>
                      <div style={{ position: "absolute", inset: 14, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.16)" }} />
                      <div style={{ position: "absolute", top: 10, left: "50%", width: 2, height: 14, background: "#fff", transform: "translateX(-50%)" }} />
                      <div style={{ position: "absolute", bottom: 10, left: "50%", width: 2, height: 14, background: "#fff", transform: "translateX(-50%)" }} />
                      <div style={{ position: "absolute", left: 10, top: "50%", width: 14, height: 2, background: "#fff", transform: "translateY(-50%)" }} />
                      <div style={{ position: "absolute", right: 10, top: "50%", width: 14, height: 2, background: "#fff", transform: "translateY(-50%)" }} />
                      <div style={{ fontSize: 20, fontWeight: 500, lineHeight: 1 }}>{activeWeather.wind}<br />km/h</div>
                      <div style={{ position: "absolute", top: 10, right: 16, transform: `rotate(${activeWeather.windDeg}deg)`, width: 2, height: 26, background: "#fff", borderRadius: 999 }} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="tile tile-dark" style={{ padding: 14, minHeight: 250, position: "relative", overflow: "hidden" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, marginBottom: 10 }}>PRECIPITATION</div>
                  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 72% 28%, rgba(0,0,0,0.16), transparent 26%), linear-gradient(145deg, rgba(77,81,86,0.96), rgba(57,62,66,0.98))" }} />
                  <div style={{ position: "relative", zIndex: 1, height: 198, borderRadius: 16, background: "linear-gradient(180deg, rgba(24,28,34,0.92), rgba(33,37,44,0.96))", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
                    {googleMapEmbedSrc ? (
                      <iframe
                        title={`Weather map for ${activeWeather.location}`}
                        src={googleMapEmbedSrc}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        style={{ width: "100%", height: "100%", border: "none", filter: "saturate(0.9) contrast(1.02)" }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "rgba(255,255,255,0.72)", fontSize: 12, padding: 16, textAlign: "center" }}>
                        Google Maps API key missing. Add VITE_GOOGLE_MAPS_API_KEY to show live map.
                      </div>
                    )}
                    <div style={{ position: "absolute", left: 14, top: 12, color: "rgba(255,255,255,0.88)", fontSize: 12, fontWeight: 600, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>{activeWeather.location}</div>
                    <div style={{ position: "absolute", left: 14, bottom: 14, color: "rgba(255,255,255,0.72)", fontSize: 12 }}>{todayPrecipitationMm} mm</div>
                    <div style={{ position: "absolute", right: 14, bottom: 14, color: "rgba(255,255,255,0.72)", fontSize: 12 }}>{nextWetDay ? `Next higher rain chance on ${nextWetDay}.` : "No major rain event expected soon."}</div>
                  </div>
                </div>

                <div className="tile tile-dark" style={{ padding: 14, minHeight: 138 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, marginBottom: 10 }}>FEELS LIKE</div>
                  <div style={{ fontSize: 30, fontWeight: 300, lineHeight: 1 }}>{activeWeather.feelsLike}°</div>
                  <div style={{ marginTop: 10, fontSize: 11, lineHeight: 1.45, opacity: 0.82 }}>{activeWeather.feelsLike >= activeWeather.temp ? "It feels warmer than the actual temperature." : "It feels cooler than the actual temperature."}</div>
                </div>
              </div>
            </div>

            <div className="weather-compact-panels" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 12 }}>
              <div className="tile tile-dark" style={{ minHeight: 248 }}>
                <div style={{ padding: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, marginBottom: 10 }}>10-DAY FORECAST</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {activeForecast.slice(0, 8).map((entry) => (
                      <div key={entry.day} style={{ display: "grid", gridTemplateColumns: "58px 24px 1fr 38px", gap: 8, alignItems: "center", fontSize: 13 }}>
                        <div style={{ fontWeight: 700 }}>{entry.day}</div>
                        <WeatherIcon type={entry.kind} size={17} />
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: "rgba(255,255,255,0.72)" }}>{entry.low}°</span>
                          <div style={{ position: "relative", height: 4, flex: 1, borderRadius: 999, background: "rgba(255,255,255,0.12)" }}>
                            <div style={{ position: "absolute", left: `${Math.min(84, Math.max(10, entry.low * 4))}%`, width: `${Math.max(12, (entry.high - entry.low) * 5)}%`, height: 4, borderRadius: 999, background: "linear-gradient(90deg, #ffd150, #ffbf35, #ff9b2f)" }} />
                          </div>
                          <span style={{ color: "rgba(255,255,255,0.72)" }}>{entry.high}°</span>
                        </div>
                        <div style={{ textAlign: "right", color: "rgba(255,255,255,0.72)" }}>{entry.precipitation}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                <div className="tile tile-dark" style={{ minHeight: 120, padding: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, marginBottom: 10 }}>UV INDEX</div>
                  <div style={{ fontSize: 28, fontWeight: 300, lineHeight: 1 }}>{activeWeather.uvIndex ?? "--"}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{activeUvLabel}</div>
                  <div style={{ height: 4, borderRadius: 999, marginTop: 12, background: "linear-gradient(90deg, #50d17c, #ffd150, #ff9b2f, #ff3b30, #d02dff)" }} />
                  <div style={{ marginTop: 8, fontSize: 11, lineHeight: 1.35, opacity: 0.82 }}>Use sun protection when UV is moderate or above.</div>
                </div>

                <div className="tile tile-dark" style={{ minHeight: 120, padding: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, marginBottom: 10 }}>SUNSET</div>
                  <div style={{ fontSize: 30, fontWeight: 300, lineHeight: 1 }}>{activeWeather.sunset}</div>
                  <div style={{ marginTop: 8, fontSize: 11, opacity: 0.82 }}>Sunrise: {activeWeather.sunrise}</div>
                </div>

                <div className="tile tile-dark" style={{ minHeight: 120, padding: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, marginBottom: 10 }}>FEELS LIKE</div>
                  <div style={{ fontSize: 28, fontWeight: 300, lineHeight: 1 }}>{activeWeather.feelsLike}°</div>
                  <div style={{ marginTop: 8, fontSize: 11, opacity: 0.82 }}>Humidity is {activeWeather.humidity}%.</div>
                </div>

                <div className="tile tile-dark" style={{ minHeight: 120, padding: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, marginBottom: 10 }}>PRECIPITATION</div>
                  <div style={{ fontSize: 28, fontWeight: 300, lineHeight: 1 }}>{todayPrecipitationMm} mm</div>
                  <div style={{ marginTop: 8, fontSize: 11, opacity: 0.82 }}>Today</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}