import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type Tab = "world" | "alarm" | "stopwatch" | "timer";

type WorldClock = {
  city: string;
  timezone: string;
  sunrise: string;
  sunset: string;
  marker: { x: number; y: number };
};

type WorldMapPoint = {
  city: string;
  timezone: string;
  marker: { x: number; y: number };
  labelAlign: "left" | "center" | "right";
};

interface AlarmItem {
  id: string;
  time: string;
  label: string;
  enabled: boolean;
  days: string;
}

const WORLD_CLOCKS: WorldClock[] = [
  { city: "London", timezone: "Europe/London", sunrise: "05:08", sunset: "21:04", marker: { x: 50, y: 23 } },
  { city: "Bangkok", timezone: "Asia/Bangkok", sunrise: "05:59", sunset: "18:48", marker: { x: 79, y: 45 } },
  { city: "Detroit", timezone: "America/Detroit", sunrise: "06:14", sunset: "21:02", marker: { x: 25, y: 37 } },
  { city: "Atlanta", timezone: "America/New_York", sunrise: "06:41", sunset: "20:45", marker: { x: 20, y: 45 } },
  { city: "Sydney", timezone: "Australia/Sydney", sunrise: "06:55", sunset: "17:08", marker: { x: 92, y: 64 } },
  { city: "Phoenix", timezone: "America/Phoenix", sunrise: "05:33", sunset: "19:35", marker: { x: 11, y: 31 } },
];

const WORLD_MAP_POINTS: WorldMapPoint[] = [
  { city: "Las Vegas", timezone: "America/Los_Angeles", marker: { x: 8, y: 31 }, labelAlign: "left" },
  { city: "Phoenix", timezone: "America/Phoenix", marker: { x: 15, y: 35 }, labelAlign: "left" },
  { city: "Monterrey", timezone: "America/Monterrey", marker: { x: 18, y: 39 }, labelAlign: "left" },
  { city: "Detroit", timezone: "America/Detroit", marker: { x: 28, y: 32 }, labelAlign: "left" },
  { city: "Atlanta", timezone: "America/New_York", marker: { x: 34, y: 35 }, labelAlign: "left" },
  { city: "London", timezone: "Europe/London", marker: { x: 50, y: 25 }, labelAlign: "center" },
  { city: "Bangkok", timezone: "Asia/Bangkok", marker: { x: 75, y: 41 }, labelAlign: "left" },
  { city: "Makassar", timezone: "Asia/Makassar", marker: { x: 84, y: 47 }, labelAlign: "left" },
  { city: "Sydney", timezone: "Australia/Sydney", marker: { x: 92, y: 59 }, labelAlign: "left" },
];

const ALARMS: AlarmItem[] = [
  { id: "1", time: "6:30", label: "Wake up", enabled: true, days: "Weekdays" },
  { id: "2", time: "8:00", label: "Stand Up Call", enabled: true, days: "Mon, Wed, Fri" },
  { id: "3", time: "22:00", label: "Wind down", enabled: false, days: "Every day" },
];

function getZoneParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const parts = formatter.formatToParts(date);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    hour: Number(read("hour")),
    minute: Number(read("minute")),
    second: Number(read("second")),
    dateKey: `${read("year")}-${read("month").padStart(2, "0")}-${read("day").padStart(2, "0")}`,
  };
}

function formatZoneTime(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function getLocalZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function zoneDayLabel(date: Date, timeZone: string) {
  const localKey = getZoneParts(date, getLocalZone()).dateKey;
  const targetKey = getZoneParts(date, timeZone).dateKey;
  if (targetKey === localKey) return "Today";
  return targetKey > localKey ? "Tomorrow" : "Yesterday";
}

function zoneOffsetLabel(date: Date, timeZone: string) {
  const local = getZoneParts(date, getLocalZone());
  const target = getZoneParts(date, timeZone);
  let difference = target.hour * 60 + target.minute - (local.hour * 60 + local.minute);

  if (difference > 720) difference -= 1440;
  if (difference < -720) difference += 1440;

  const hours = Math.round(difference / 60);
  const sign = hours >= 0 ? "+" : "-";

  return `${zoneDayLabel(date, timeZone)}, ${sign}${Math.abs(hours)} HRS`;
}

function isDaytime(timeZone: string, date: Date) {
  const { hour } = getZoneParts(date, timeZone);
  return hour >= 6 && hour < 20;
}

type AnalogClockProps = {
  size?: number;
  date: Date;
  timeZone?: string;
  darkFace?: boolean;
};

function AnalogClock({ size = 120, date, timeZone, darkFace = false }: AnalogClockProps) {
  const zone = timeZone ? getZoneParts(date, timeZone) : null;
  const hour = zone ? zone.hour : date.getHours();
  const minute = zone ? zone.minute : date.getMinutes();
  const second = zone ? zone.second : date.getSeconds();

  const secDeg = second * 6;
  const minDeg = minute * 6 + second * 0.1;
  const hrDeg = (hour % 12) * 30 + minute * 0.5;
  const face = darkFace ? "#050505" : "#fbfbfb";
  const text = darkFace ? "#f7f7f7" : "#1c1c1e";
  const subtle = darkFace ? "rgba(255,255,255,0.9)" : "rgba(28,28,30,0.95)";

  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="58" fill={face} />
      {Array.from({ length: 12 }).map((_, index) => {
        const angle = (index * 30 * Math.PI) / 180;
        const x1 = 60 + 49 * Math.sin(angle);
        const y1 = 60 - 49 * Math.cos(angle);
        const x2 = 60 + 55 * Math.sin(angle);
        const y2 = 60 - 55 * Math.cos(angle);
        return <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke={subtle} strokeWidth="2" strokeLinecap="round" />;
      })}
      {Array.from({ length: 12 }).map((_, index) => {
        const number = index === 0 ? 12 : index;
        const angle = ((index - 1) * 30 * Math.PI) / 180;
        const x = 60 + 42 * Math.sin(angle);
        const y = 60 - 42 * Math.cos(angle);
        return (
          <text key={number} x={x} y={y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill={text}>
            {number}
          </text>
        );
      })}
      <line x1="60" y1="60" x2={60 + 28 * Math.sin((hrDeg * Math.PI) / 180)} y2={60 - 28 * Math.cos((hrDeg * Math.PI) / 180)} stroke={text} strokeWidth="3.2" strokeLinecap="round" />
      <line x1="60" y1="60" x2={60 + 40 * Math.sin((minDeg * Math.PI) / 180)} y2={60 - 40 * Math.cos((minDeg * Math.PI) / 180)} stroke={text} strokeWidth="2.4" strokeLinecap="round" />
      <line x1="60" y1="60" x2={60 + 44 * Math.sin((secDeg * Math.PI) / 180)} y2={60 - 44 * Math.cos((secDeg * Math.PI) / 180)} stroke="#c7c7cc" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="60" cy="60" r="3" fill={text} />
    </svg>
  );
}

function ClockCard({ city, timezone, sunrise, sunset, now }: WorldClock & { now: Date }) {
  const currentTime = formatZoneTime(now, timezone);
  const darkFace = !isDaytime(timezone, now);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        background: "rgba(48,48,50,0.94)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 18,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        minHeight: 140,
      }}
    >
      <AnalogClock size={112} date={now} timeZone={timezone} darkFace={darkFace} />
      <div style={{ textAlign: "center", width: "100%" }}>
        <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.15, color: "var(--c-text)" }}>
          {city}, {currentTime}
        </div>
        <div style={{ fontSize: 12, color: "var(--c-text-secondary)", marginTop: 3, lineHeight: 1.2 }}>{zoneOffsetLabel(now, timezone)}</div>
        <div style={{ fontSize: 12, color: "var(--c-text-secondary)", marginTop: 2, lineHeight: 1.2 }}>Sunrise: {sunrise}</div>
        <div style={{ fontSize: 12, color: "var(--c-text-secondary)", marginTop: 2, lineHeight: 1.2 }}>Sunset: {sunset}</div>
      </div>
    </motion.div>
  );
}

function WorldMapPanel({ now }: { now: Date }) {
  return (
    <div
      style={{
        position: "relative",
        height: 336,
        borderRadius: 18,
        overflow: "hidden",
        background:
          "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08), transparent 40%), linear-gradient(180deg, rgba(12,12,14,0.98), rgba(3,3,4,0.98))",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          opacity: 0.32,
        }}
      />
      <svg viewBox="0 0 1000 360" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <path d="M20,225 C160,55 345,65 470,185 C575,286 790,296 980,160" fill="none" stroke="rgba(255,255,255,0.72)" strokeWidth="1.5" />
      </svg>

      {WORLD_MAP_POINTS.map((clock) => {
        const time = formatZoneTime(now, clock.timezone);
        const highlight = clock.city === "London" || clock.city === "Bangkok" || clock.city === "Sydney";
        const labelStyle =
          clock.labelAlign === "center"
            ? { alignItems: "center" as const, textAlign: "center" as const }
            : clock.labelAlign === "right"
              ? { alignItems: "flex-end" as const, textAlign: "right" as const }
              : { alignItems: "flex-start" as const, textAlign: "left" as const };

        return (
          <div
            key={clock.city}
            style={{
              position: "absolute",
              left: `${clock.marker.x}%`,
              top: `${clock.marker.y}%`,
              transform: "translate(-50%, -50%)",
              display: "flex",
              flexDirection: "column",
              ...labelStyle,
              gap: 2,
              color: "#f5f5f7",
              textShadow: "0 1px 2px rgba(0,0,0,0.65)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexDirection: clock.labelAlign === "right" ? "row-reverse" : "row" }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: highlight ? "#f2f2f7" : "#8c8c93", boxShadow: "0 0 0 4px rgba(255,255,255,0.08)" }} />
              <span style={{ fontSize: clock.city === "London" ? 18 : 17, fontWeight: 700, lineHeight: 1 }}>{clock.city}</span>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1, opacity: 0.96 }}>{time}</div>
          </div>
        );
      })}
    </div>
  );
}

function WorldTab({ now }: { now: Date }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 16 }}>
      <WorldMapPanel now={now} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
        {WORLD_CLOCKS.map((clock) => (
          <ClockCard key={clock.city} {...clock} now={now} />
        ))}
      </div>
    </div>
  );
}

function AlarmTab() {
  const [alarms, setAlarms] = useState(ALARMS);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 16, fontWeight: 700 }}>Alarms</span>
        <button style={{ background: "var(--c-bg-tertiary)", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, color: "var(--c-text)", cursor: "pointer" }}>+ Add</button>
      </div>

      {alarms.map((alarm) => (
        <motion.div
          key={alarm.id}
          layout
          style={{
            display: "flex",
            alignItems: "center",
            padding: "14px 0",
            borderBottom: "0.5px solid var(--c-border)",
          }}
        >
          <div style={{ flex: 1 }}>
            <div className="font-display font-tabular" style={{ fontSize: 42, fontWeight: 200, letterSpacing: "-1px", color: alarm.enabled ? "var(--c-text)" : "var(--c-text-tertiary)" }}>{alarm.time}</div>
            <div style={{ fontSize: 12, color: "var(--c-text-secondary)", marginTop: 2 }}>{alarm.label} · {alarm.days}</div>
          </div>
          <div
            onClick={() => setAlarms((current) => current.map((item) => (item.id === alarm.id ? { ...item, enabled: !item.enabled } : item)))}
            style={{
              width: 44,
              height: 26,
              borderRadius: 13,
              background: alarm.enabled ? "#34C759" : "var(--c-bg-tertiary)",
              cursor: "pointer",
              position: "relative",
              flexShrink: 0,
            }}
          >
            <div style={{ position: "absolute", top: 3, left: alarm.enabled ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "white", transition: "left 0.25s ease", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function StopwatchTab() {
  const [stopwatch, setStopwatch] = useState({ running: false, elapsed: 0, laps: [] as number[] });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (stopwatch.running) {
      intervalRef.current = setInterval(() => {
        setStopwatch((current) => ({ ...current, elapsed: current.elapsed + 10 }));
      }, 10);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [stopwatch.running]);

  const formatMs = (ms: number) => {
    const min = Math.floor(ms / 60000);
    const sec = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 32, gap: 24 }}>
      <div className="font-display font-tabular" style={{ fontSize: 72, fontWeight: 200, letterSpacing: "-2px", color: "var(--c-text)" }}>{formatMs(stopwatch.elapsed)}</div>
      <div style={{ display: "flex", gap: 16 }}>
        <button onClick={() => setStopwatch((current) => ({ ...current, elapsed: current.running ? current.elapsed : 0, laps: current.running ? [...current.laps, current.elapsed] : [], running: current.running ? false : current.running }))} style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--c-bg-tertiary)", border: "none", cursor: "pointer", color: "var(--c-text)", fontSize: 14, fontWeight: 500 }}>{stopwatch.running ? "Lap" : "Reset"}</button>
        <button onClick={() => setStopwatch((current) => ({ ...current, running: !current.running }))} style={{ width: 64, height: 64, borderRadius: "50%", background: stopwatch.running ? "rgba(255,59,48,0.15)" : "rgba(52,199,89,0.15)", border: `2px solid ${stopwatch.running ? "#FF3B30" : "#34C759"}`, cursor: "pointer", color: stopwatch.running ? "#FF3B30" : "#34C759", fontSize: 14, fontWeight: 600 }}>{stopwatch.running ? "Stop" : "Start"}</button>
      </div>
      {stopwatch.laps.length > 0 && (
        <div style={{ width: "100%", maxWidth: 280 }}>
          {stopwatch.laps.map((lap, index) => (
            <div key={index} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid var(--c-border)", fontSize: 14, color: "var(--c-text-secondary)" }}>
              <span>Lap {index + 1}</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{formatMs(lap)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimerTab() {
  const [timer, setTimer] = useState({ running: false, total: 5 * 60 * 1000, remaining: 5 * 60 * 1000 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timer.running) {
      intervalRef.current = setInterval(() => {
        setTimer((current) => {
          const next = current.remaining - 1000;
          if (next <= 0) return { ...current, running: false, remaining: 0 };
          return { ...current, remaining: next };
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timer.running]);

  const formatTimer = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const adjustTimer = (deltaMs: number) => {
    setTimer((current) => {
      if (current.running) return current;
      const total = Math.max(0, Math.min(99 * 3600000, current.total + deltaMs));
      return { ...current, total, remaining: total };
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: 28, gap: 22 }}>
      {!timer.running && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { label: "-5m", delta: -5 * 60000 },
            { label: "-1m", delta: -60000 },
            { label: "+1m", delta: 60000 },
            { label: "+5m", delta: 5 * 60000 },
          ].map((button) => (
            <button key={button.label} onClick={() => adjustTimer(button.delta)} style={{ padding: "6px 12px", borderRadius: 10, background: "var(--c-bg-tertiary)", border: "none", cursor: "pointer", color: "var(--c-text)", fontSize: 13, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
              {button.label}
            </button>
          ))}
        </div>
      )}

      <div className="font-display font-tabular" style={{ fontSize: 72, fontWeight: 200, letterSpacing: "-2px", color: timer.remaining === 0 ? "#FF3B30" : "var(--c-text)", transition: "color 0.3s ease" }}>{formatTimer(timer.remaining)}</div>

      <div style={{ display: "flex", gap: 16 }}>
        <button onClick={() => setTimer((current) => ({ ...current, running: false, remaining: current.total }))} style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--c-bg-tertiary)", border: "none", cursor: "pointer", color: "var(--c-text)", fontSize: 14, fontWeight: 500 }}>Reset</button>
        <button onClick={() => setTimer((current) => (current.remaining === 0 ? current : { ...current, running: !current.running }))} disabled={timer.remaining === 0} style={{ width: 64, height: 64, borderRadius: "50%", background: timer.running ? "rgba(255,59,48,0.15)" : "rgba(52,199,89,0.15)", border: `2px solid ${timer.running ? "#FF3B30" : "#34C759"}`, cursor: timer.remaining === 0 ? "default" : "pointer", opacity: timer.remaining === 0 ? 0.4 : 1, color: timer.running ? "#FF3B30" : "#34C759", fontSize: 14, fontWeight: 600 }}>{timer.running ? "Pause" : "Start"}</button>
      </div>
    </div>
  );
}

export default function Clock() {
  const [tab, setTab] = useState<Tab>("world");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: "world", label: "World Clock" },
    { id: "alarm", label: "Alarms" },
    { id: "stopwatch", label: "Stopwatch" },
    { id: "timer", label: "Timers" },
  ];

  return (
    <div className="macos-window" style={{ display: "flex", flexDirection: "column", width: "100%", height: "72%", background: "#1f1f1f", color: "var(--c-text)", overflow: "hidden", borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
      <div className="macos-toolbar" style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px" }}>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div className="macos-pill" style={{ display: "flex", alignItems: "center", padding: 3 }}>
            {tabs.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                style={{
                  border: "none",
                  cursor: "pointer",
                  borderRadius: 999,
                  padding: "7px 16px",
                  minWidth: 104,
                  background: tab === item.id ? "rgba(255,255,255,0.16)" : "transparent",
                  color: tab === item.id ? "#ffffff" : "rgba(255,255,255,0.7)",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <button style={{ width: 36, height: 36, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 22, lineHeight: 1, cursor: "pointer" }}>+</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{ minHeight: "100%" }}
          >
            {tab === "world" && <WorldTab now={now} />}
            {tab === "alarm" && <AlarmTab />}
            {tab === "stopwatch" && <StopwatchTab />}
            {tab === "timer" && <TimerTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}