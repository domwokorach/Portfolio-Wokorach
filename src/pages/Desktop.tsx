import React from "react";
import { apps, launchpadApps } from "~/configs";
import { minMarginY, isFullScreen, enterFullScreen, exitFullScreen } from "~/utils";
import type { MacActions } from "~/types";
import DynamicIsland from "~/components/DynamicIsland";
import NotificationCenter from "~/components/NotificationCenter";
import AboutThisMacModal from "~/components/AboutThisMacModal";
import CalendarWidget from "~/components/widgets/CalendarWidget";
import WeatherWidget from "~/components/widgets/WeatherWidget";
import ContextMenu from "~/components/menus/ContextMenu";
import { AnimatePresence } from "framer-motion";
import { useWindowSize } from "~/hooks";

interface DesktopState {
  showApps: { [key: string]: boolean };
  appsZ: { [key: string]: number };
  maxApps: { [key: string]: boolean };
  minApps: { [key: string]: boolean };
  maxZ: number;
  showLaunchpad: boolean;
  currentTitle: string;
  hideDockAndTopbar: boolean;
  spotlight: boolean;
  showNotificationCenter: boolean;
}

interface DesktopEntry {
  id: string;
  name: string;
  kind: "folder" | "file";
  icon: string;
  side?: "left" | "right";
  x: number;
  y: number;
  openAppId?: string;
  finderLocation?: string;
  link?: string;
}

interface DesktopDragState {
  id: string;
  offsetX: number;
  offsetY: number;
}

interface DragPoint {
  x: number;
  y: number;
}

const DESKTOP_STORAGE_KEY = "portfolio.desktop.entries.v1";
const ICON_WIDTH = 74;
const ICON_HEIGHT = 86;
const GRID_STEP_X = 96;
const GRID_STEP_Y = 120;
const GRID_MIN_X = 8;
const GRID_MIN_Y = 48;
const GRID_RIGHT_PADDING = 8;
const GRID_BOTTOM_PADDING = 76;
const RENAME_INTENT_DELAY_MS = 350;

function clampDesktopPosition(x: number, y: number) {
  const maxX = Math.max(GRID_MIN_X, window.innerWidth - ICON_WIDTH - GRID_RIGHT_PADDING);
  const maxY = Math.max(GRID_MIN_Y, window.innerHeight - ICON_HEIGHT - GRID_BOTTOM_PADDING);

  return {
    x: Math.max(GRID_MIN_X, Math.min(maxX, x)),
    y: Math.max(GRID_MIN_Y, Math.min(maxY, y)),
  };
}

function snapDesktopPosition(x: number, y: number) {
  const snappedX = GRID_MIN_X + Math.round((x - GRID_MIN_X) / GRID_STEP_X) * GRID_STEP_X;
  const snappedY = GRID_MIN_Y + Math.round((y - GRID_MIN_Y) / GRID_STEP_Y) * GRID_STEP_Y;
  return clampDesktopPosition(snappedX, snappedY);
}

function normalizeDesktopEntries(raw: unknown): DesktopEntry[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const e = entry as Partial<DesktopEntry>;
      if (typeof e.id !== "string" || typeof e.name !== "string") return null;
      if (e.kind !== "folder" && e.kind !== "file") return null;
      if (typeof e.icon !== "string") return null;
      if (typeof e.x !== "number" || typeof e.y !== "number") return null;

      const pos = clampDesktopPosition(e.x, e.y);
      return {
        id: e.id,
        name: e.name,
        kind: e.kind,
        icon: e.icon,
        side: e.side === "left" ? "left" : e.side === "right" ? "right" : undefined,
        x: pos.x,
        y: pos.y,
        openAppId: e.openAppId,
        finderLocation: e.finderLocation,
        link: e.link,
      };
    })
    .filter((entry): entry is DesktopEntry => entry !== null);
}

function getNextDesktopFolderId(entries: DesktopEntry[]): string {
  const prefix = "desktop-folder-";
  const maxId = entries.reduce((acc, entry) => {
    if (!entry.id.startsWith(prefix)) return acc;
    const n = Number(entry.id.slice(prefix.length));
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return `${prefix}${maxId + 1}`;
}

const INITIAL_DESKTOP_ENTRIES: DesktopEntry[] = [
  {
    id: "desktop-project-1",
    name: "Desktop",
    kind: "folder",
    icon: "/img/icons/folder-generic.png",
    side: "right",
    x: 1160,
    y: 128,
    openAppId: "finder",
    finderLocation: "desktop",
  },
  {
    id: "desktop-project-2",
    name: "Projects",
    kind: "folder",
    icon: "/img/icons/folder-generic.png",
    side: "right",
    x: 1160,
    y: 248,
    openAppId: "finder",
  },
  {
    id: "desktop-project-3",
    name: "Resume",
    kind: "folder",
    icon: "/img/icons/folder-generic.png",
    side: "right",
    x: 1160,
    y: 368,
    openAppId: "finder",
  },
];

function getInitialDesktopEntries(): DesktopEntry[] {
  if (typeof window === "undefined") return INITIAL_DESKTOP_ENTRIES;

  try {
    const raw = window.localStorage.getItem(DESKTOP_STORAGE_KEY);
    if (!raw) return INITIAL_DESKTOP_ENTRIES;

    const parsed = JSON.parse(raw);
    const restoredEntries = normalizeDesktopEntries(parsed);
    return restoredEntries.length > 0 ? restoredEntries : INITIAL_DESKTOP_ENTRIES;
  } catch {
    // Ignore invalid storage and keep defaults.
    return INITIAL_DESKTOP_ENTRIES;
  }
}

// Build the initial state map from apps config — includes ALL apps
function buildInitialState(): Pick<DesktopState, "showApps" | "appsZ" | "maxApps" | "minApps"> {
  const showApps: { [key: string]: boolean } = {};
  const appsZ: { [key: string]: number } = {};
  const maxApps: { [key: string]: boolean } = {};
  const minApps: { [key: string]: boolean } = {};
  apps.forEach((app) => {
    showApps[app.id] = !!app.show;
    appsZ[app.id] = 2;
    maxApps[app.id] = false;
    minApps[app.id] = false;
  });
  return { showApps, appsZ, maxApps, minApps };
}

const INITIAL = buildInitialState();

export default function Desktop(props: MacActions) {
  const [state, setState] = useState<DesktopState>({
    ...INITIAL,
    maxZ: 2,
    showLaunchpad: false,
    currentTitle: "Finder",
    hideDockAndTopbar: false,
    spotlight: false,
    showNotificationCenter: false,
  });

  const [spotlightBtnRef, setSpotlightBtnRef] =
    useState<React.RefObject<HTMLDivElement> | null>(null);
  const [showAboutMac, setShowAboutMac] = useState(false);
  const [desktopEntries, setDesktopEntries] = useState<DesktopEntry[]>(getInitialDesktopEntries);
  const [dragState, setDragState] = useState<DesktopDragState | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [renamingEntryId, setRenamingEntryId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const dragFrameRef = React.useRef<number | null>(null);
  const dragPointRef = React.useRef<DragPoint | null>(null);
  const dragStartedRef = React.useRef(false);
  const renameInputRef = React.useRef<HTMLInputElement | null>(null);
  const renameIntentTimeoutRef = React.useRef<number | null>(null);

  const { dark, brightness, getWallpaper } = useStore((s) => ({
    dark: s.dark,
    brightness: s.brightness,
    getWallpaper: s.getWallpaper,
  }));

  const { isMobile } = useWindowSize();

  const activeWallpaper = getWallpaper();

  const handleLaunchpadAppClick = (e: React.MouseEvent, link: string) => {
    e.stopPropagation();
    e.preventDefault();
    useStore.getState().setSafariUrl(link);
    window.dispatchEvent(new CustomEvent("launchpad:openSafari"));
  };

  const toggleLaunchpad = (target: boolean): void => {
    setState((prev) => ({ ...prev, showLaunchpad: target }));
  };

  const toggleSpotlight = (): void => {
    setState((prev) => ({ ...prev, spotlight: !prev.spotlight }));
  };

  const toggleNotificationCenter = (): void => {
    setState((prev) => ({ ...prev, showNotificationCenter: !prev.showNotificationCenter }));
  };

  const setWindowPosition = (id: string): void => {
    const r = document.querySelector(`#window-${id}`) as HTMLElement;
    if (!r) return;
    const rect = r.getBoundingClientRect();
    r.style.setProperty("--window-transform-x", (window.innerWidth + rect.x).toFixed(1) + "px");
    r.style.setProperty("--window-transform-y", (rect.y - minMarginY).toFixed(1) + "px");
  };

  const setAppMax = (id: string, target?: boolean): void => {
    setState((prev) => {
      const maxApps = { ...prev.maxApps };
      if (target === undefined) target = !maxApps[id];
      maxApps[id] = target!;
      return { ...prev, maxApps, hideDockAndTopbar: target! };
    });
  };

  const minimizeApp = (id: string): void => {
    setWindowPosition(id);
    const dock = document.querySelector(`#dock-${id}`) as HTMLElement;
    const win = document.querySelector(`#window-${id}`) as HTMLElement;
    if (!dock || !win) return;
    const dockRect = dock.getBoundingClientRect();
    const posY = window.innerHeight - win.offsetHeight / 2 - minMarginY;
    const posX = window.innerWidth + dockRect.x - win.offsetWidth / 2 + 25;
    win.style.transform = `translate(${posX}px, ${posY}px) scale(0.2)`;
    win.style.transition = "ease-out 0.3s";
    setState((prev) => ({ ...prev, minApps: { ...prev.minApps, [id]: true } }));
  };

  const closeApp = (id: string): void => {
    setState((prev) => ({
      ...prev,
      showApps: { ...prev.showApps, [id]: false },
      maxApps: { ...prev.maxApps, [id]: false },
      hideDockAndTopbar: false,
    }));
  };

  const openApp = (id: string): void => {
    const appDef = apps.find((a) => a.id === id);
    if (!appDef) {
      console.warn(`openApp: unknown app id "${id}"`);
      return;
    }

    setState((prev) => {
      const maxZ = prev.maxZ + 1;
      const showApps = { ...prev.showApps, [id]: true };
      const appsZ = { ...prev.appsZ, [id]: maxZ };

      // Un-minimize if needed
      const minApps = { ...prev.minApps };
      if (minApps[id]) {
        const win = document.querySelector(`#window-${id}`) as HTMLElement;
        if (win) {
          win.style.transform = `translate(${win.style.getPropertyValue("--window-transform-x")}, ${win.style.getPropertyValue("--window-transform-y")}) scale(1)`;
          win.style.transition = "ease-in 0.3s";
        }
        minApps[id] = false;
      }

      return {
        ...prev,
        showApps,
        appsZ,
        maxZ,
        minApps,
        currentTitle: appDef.title,
      };
    });
  };

  // Listen for cross-component events and global keyboard shortcuts
  useEffect(() => {
    const handleOpenSafari = () => {
      toggleLaunchpad(false);
      openApp("safari");
    };
    const handleOpenLaunchpad = () => toggleLaunchpad(true);
    const handleOpenApp = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (customEvent.detail) {
        openApp(customEvent.detail);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl && e.code === "Space") {
        e.preventDefault();
        toggleSpotlight();
      }

      if ((isCmdOrCtrl && e.key.toLowerCase() === "f") || e.key === "F11") {
        e.preventDefault();
        if (isFullScreen()) {
          exitFullScreen();
          useStore.getState().toggleFullScreen(false);
        } else {
          enterFullScreen();
          useStore.getState().toggleFullScreen(true);
        }
      }

      if ((isCmdOrCtrl && e.key === "ArrowDown") || e.key === "F1") {
        e.preventDefault();
        const currentBrightness = useStore.getState().brightness as number;
        useStore.getState().setBrightness(Math.max(currentBrightness - 10, 1));
      }

      if ((isCmdOrCtrl && e.key === "ArrowUp") || e.key === "F2") {
        e.preventDefault();
        const currentBrightness = useStore.getState().brightness as number;
        useStore.getState().setBrightness(Math.min(currentBrightness + 10, 100));
      }
    };

    window.addEventListener("launchpad:openSafari", handleOpenSafari);
    window.addEventListener("siri:openLaunchpad", handleOpenLaunchpad);
    window.addEventListener("desktop:openApp", handleOpenApp);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("launchpad:openSafari", handleOpenSafari);
      window.removeEventListener("siri:openLaunchpad", handleOpenLaunchpad);
      window.removeEventListener("desktop:openApp", handleOpenApp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [state]);

  useEffect(() => {
    window.localStorage.setItem(DESKTOP_STORAGE_KEY, JSON.stringify(desktopEntries));
  }, [desktopEntries]);

  useEffect(() => {
    if (!renamingEntryId || !renameInputRef.current) return;
    renameInputRef.current.focus();
    renameInputRef.current.select();
  }, [renamingEntryId]);

  useEffect(() => {
    return () => {
      if (renameIntentTimeoutRef.current !== null) {
        window.clearTimeout(renameIntentTimeoutRef.current);
      }
    };
  }, []);

  const renderAppWindows = () => {
    return apps.map((app) => {
      if (!app.desktop) return null;

      if (app.id === "siri" && state.showApps[app.id]) {
        return (
          <div
            key={`desktop-app-${app.id}`}
            className="fixed top-8 right-4 z-[1000] drop-shadow-2xl flex items-start justify-end"
          >
            {React.cloneElement(app.content as React.ReactElement, {
              closeSiri: () => closeApp("siri"),
            })}
          </div>
        );
      }

      if (!app.content) return null;

      const windowProps = {
        id: app.id,
        title: app.title,
        width: app.width,
        height: app.height,
        minWidth: app.minWidth,
        minHeight: app.minHeight,
        aspectRatio: app.aspectRatio,
        x: app.x,
        y: app.y,
        z: state.appsZ[app.id] ?? 2,
        max: state.maxApps[app.id] ?? false,
        min: state.minApps[app.id] ?? false,
        titlebar: app.titlebar,
        close: closeApp,
        setMax: setAppMax,
        setMin: minimizeApp,
        focus: openApp,
      };

      return (
        <AnimatePresence key={`desktop-app-${app.id}`}>
          {state.showApps[app.id] && (
            <AppWindow {...windowProps}>
              {app.content}
            </AppWindow>
          )}
        </AnimatePresence>
      );
    });
  };

  const bgStyle: React.CSSProperties = {
    backgroundImage: `url(${dark ? activeWallpaper.night : activeWallpaper.day})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: `brightness(${(brightness as number) * 0.7 + 50}%)`
  };
  bgStyle["trans" + "ition"] = "filter 0.3s ea" + "se";

  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0 });

  const openDesktopEntry = (entry: DesktopEntry) => {
    if (entry.openAppId) {
      openApp(entry.openAppId);

      if (entry.openAppId === "finder" && entry.finderLocation) {
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent("finder:openLocation", { detail: entry.finderLocation }));
        }, 0);
      }

      return;
    }

    if (entry.link) {
      window.open(entry.link, "_blank", "noopener,noreferrer");
    }
  };

  const createDesktopFolder = () => {
    const baseName = "New Folder";
    let name = baseName;
    let index = 2;

    while (desktopEntries.some((entry) => entry.name.toLowerCase() === name.toLowerCase())) {
      name = `${baseName} ${index}`;
      index += 1;
    }

    const rightColumnCount = desktopEntries.filter((entry) => entry.side !== "left").length;
    const nextPosition = snapDesktopPosition(1160, 128 + rightColumnCount * GRID_STEP_Y);
    const folder: DesktopEntry = {
      id: getNextDesktopFolderId(desktopEntries),
      name,
      kind: "folder",
      icon: "/img/icons/folder-generic.png",
      side: "right",
      x: nextPosition.x,
      y: nextPosition.y,
      openAppId: "finder",
    };

    setDesktopEntries((prev) => [folder, ...prev]);
    setRenamingEntryId(folder.id);
    setRenameDraft(folder.name);
  };

  const commitRename = (entryId: string) => {
    const trimmed = renameDraft.trim();
    if (!trimmed) {
      setRenamingEntryId(null);
      setRenameDraft("");
      return;
    }

    setDesktopEntries((prev) => {
      const nameExists = prev.some((entry) => (
        entry.id !== entryId && entry.name.toLowerCase() === trimmed.toLowerCase()
      ));
      if (nameExists) {
        let counter = 2;
        let fallbackName = `${trimmed} ${counter}`;
        while (prev.some((entry) => (
          entry.id !== entryId && entry.name.toLowerCase() === fallbackName.toLowerCase()
        ))) {
          counter += 1;
          fallbackName = `${trimmed} ${counter}`;
        }

        return prev.map((entry) => entry.id === entryId ? { ...entry, name: fallbackName } : entry);
      }

      return prev.map((entry) => entry.id === entryId ? { ...entry, name: trimmed } : entry);
    });

    setRenamingEntryId(null);
    setRenameDraft("");
  };

  const startRename = (entry: DesktopEntry) => {
    setRenamingEntryId(entry.id);
    setRenameDraft(entry.name);
    setSelectedEntryId(entry.id);
  };

  const clearRenameIntentTimeout = () => {
    if (renameIntentTimeoutRef.current !== null) {
      window.clearTimeout(renameIntentTimeoutRef.current);
      renameIntentTimeoutRef.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ show: true, x: e.clientX, y: e.clientY });
  };

  const beginDragEntry = (e: React.MouseEvent, entry: DesktopEntry) => {
    if (isMobile || e.button !== 0) return;
    setContextMenu((current) => ({ ...current, show: false }));
    dragStartedRef.current = false;
    setDragState({
      id: entry.id,
      offsetX: e.clientX - entry.x,
      offsetY: e.clientY - entry.y,
    });
  };

  const moveDraggedEntry = (e: React.MouseEvent) => {
    if (!dragState) return;

    const nextPos = clampDesktopPosition(e.clientX - dragState.offsetX, e.clientY - dragState.offsetY);
    const nextX = nextPos.x;
    const nextY = nextPos.y;

    dragPointRef.current = { x: nextX, y: nextY };
    dragStartedRef.current = true;

    if (dragFrameRef.current !== null) return;

    dragFrameRef.current = window.requestAnimationFrame(() => {
      const point = dragPointRef.current;
      if (point) {
        setDesktopEntries((prev) => prev.map((entry) => (
          entry.id === dragState.id ? { ...entry, x: point.x, y: point.y } : entry
        )));
      }
      dragFrameRef.current = null;
    });
  };

  const endDragEntry = () => {
    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
    dragPointRef.current = null;
    if (dragState) {
      if (dragStartedRef.current) {
        setDesktopEntries((prev) => prev.map((entry) => {
          if (entry.id !== dragState.id) return entry;
          const snapped = snapDesktopPosition(entry.x, entry.y);
          return { ...entry, x: snapped.x, y: snapped.y };
        }));
      }
      setDragState(null);
    }
    window.setTimeout(() => {
      dragStartedRef.current = false;
    }, 0);
  };

  return (
    <div
      className="size-full overflow-hidden bg-center bg-cover"
      style={bgStyle}
      onContextMenu={handleContextMenu}
      onClick={() => {
        clearRenameIntentTimeout();
        if (!dragState && !renamingEntryId) {
          setSelectedEntryId(null);
        }
      }}
      onMouseMove={moveDraggedEntry}
      onMouseUp={endDragEntry}
      onMouseLeave={endDragEntry}
    >
      {/* Top Menu Bar */}
      <TopBar
        title={state.currentTitle}
        setLogin={props.setLogin}
        shutMac={props.shutMac}
        sleepMac={props.sleepMac}
        restartMac={props.restartMac}
        toggleSpotlight={toggleSpotlight}
        hide={state.hideDockAndTopbar}
        setSpotlightBtnRef={setSpotlightBtnRef}
        openApp={openApp}
        toggleNotificationCenter={toggleNotificationCenter}
        showNotificationCenter={state.showNotificationCenter}
        openAboutMac={() => setShowAboutMac(true)}
      />

      {/* Dynamic Island */}
      <DynamicIsland currentApp={state.currentTitle} />

      {/* Desktop-pinned widgets — top-left, always visible, matches Tahoe ref */}
      <div
        style={{
          position: "fixed",
          top: 48,
          left: 16,
          zIndex: 55,
          display: "flex",
          flexDirection: "row",
          gap: 16,
          pointerEvents: "none",
        }}
      >
        <div style={{ pointerEvents: "auto" }}>
          <CalendarWidget compact={false} />
        </div>
        <div style={{ pointerEvents: "auto" }}>
          <WeatherWidget compact={false} />
        </div>
      </div>

      {/* Desktop Icons */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 55,
          pointerEvents: "none",
        }}
      >
        {desktopEntries.map((entry) => (
          <button
            key={entry.id}
            onDoubleClick={() => {
              clearRenameIntentTimeout();
              if (!dragStartedRef.current) {
                openDesktopEntry(entry);
              }
            }}
            onMouseDown={(e) => beginDragEntry(e, entry)}
            title={entry.name}
            onClick={(e) => {
              e.stopPropagation();
              if (dragStartedRef.current) return;

              const isSelected = selectedEntryId === entry.id;
              if (isSelected && renamingEntryId !== entry.id) {
                clearRenameIntentTimeout();
                renameIntentTimeoutRef.current = window.setTimeout(() => {
                  startRename(entry);
                  renameIntentTimeoutRef.current = null;
                }, RENAME_INTENT_DELAY_MS);
              } else {
                clearRenameIntentTimeout();
                setSelectedEntryId(entry.id);
              }

              if (renamingEntryId === entry.id) {
                e.stopPropagation();
              }
            }}
            style={{
              position: "absolute",
              left: entry.x,
              top: entry.y,
              background: "transparent",
              border: "none",
              cursor: dragState?.id === entry.id ? "grabbing" : "grab",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              width: 74,
              padding: 0,
              pointerEvents: "auto",
              userSelect: "none",
              transition: dragState?.id === entry.id ? "none" : "transform 0.12s ease-out",
              transform: "translateZ(0)",
            }}
          >
            <img src={entry.icon} alt={entry.kind} style={{ width: 52, height: 52, objectFit: "contain", filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.32))" }} />
            {renamingEntryId === entry.id ? (
              <input
                ref={renameInputRef}
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onBlur={() => commitRename(entry.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    commitRename(entry.id);
                  }
                  if (e.key === "Escape") {
                    setRenamingEntryId(null);
                    setRenameDraft("");
                  }
                }}
                style={{
                  width: 72,
                  fontSize: 11,
                  lineHeight: 1.25,
                  textAlign: "center",
                  color: "#111",
                  background: "rgba(255,255,255,0.95)",
                  border: "1px solid rgba(0,0,0,0.25)",
                  borderRadius: 4,
                  outline: "none",
                  padding: "1px 4px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
                }}
              />
            ) : (
              <span
                style={{
                  fontSize: 11,
                  color: "#fff",
                  textAlign: "center",
                  lineHeight: 1.25,
                  textShadow: "0 1px 3px rgba(0,0,0,0.65)",
                  maxWidth: 72,
                  borderRadius: 4,
                  padding: "1px 4px",
                  background: selectedEntryId === entry.id ? "rgba(10,132,255,0.55)" : "transparent",
                }}
              >
                {entry.name}
              </span>
            )}
          </button>
        ))}
      </div>

      {isMobile && (
        <div className="absolute top-[48px] left-0 right-0 bottom-24 p-6 grid grid-cols-4 gap-y-6 gap-x-2 content-start z-40">
          {apps.filter(a => !a.hideOnMobile && !a.dockOnMobile && a.id !== "launchpad").map(app => (
            <div key={app.id} className="flex flex-col items-center gap-1.5 cursor-pointer" onClick={() => openApp(app.id)}>
              <div className="w-[60px] h-[60px] bg-transparent rounded-[22.5%] shadow-sm overflow-hidden flex items-center justify-center border border-black/5 dark:border-white/5">
                <img src={app.mobileImg || app.img} alt={app.title} className="w-full h-full object-cover" />
              </div>
              <span className="text-white text-xs font-light text-center tracking-wide" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
                {app.mobileTitle || app.title}
              </span>
            </div>
          ))}
          {launchpadApps.map(app => (
            <div key={app.id} className="flex flex-col items-center gap-1.5 cursor-pointer" onClick={(e) => handleLaunchpadAppClick(e, app.link)}>
              <div className={`w-[60px] h-[60px] rounded-[22.5%] shadow-sm overflow-hidden flex items-center justify-center border border-black/10 dark:border-white/10 ${app.img.includes('skill-exchange') ? 'bg-black' : 'bg-white'}`}>
                <img src={app.mobileImg || app.img} alt={app.title} className="w-[60%] h-[60%] object-contain" />
              </div>
              <span className="text-white text-xs font-light text-center tracking-wide" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>
                {app.mobileTitle || app.title}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Desktop App Windows */}
      <div className="window-bound absolute" style={{ top: minMarginY, zIndex: 60, pointerEvents: "none" }}>
        {renderAppWindows()}
      </div>

      {/* About This Mac modal */}
      <AboutThisMacModal show={showAboutMac} onClose={() => setShowAboutMac(false)} />

      {/* Spotlight */}
      {state.spotlight && (
        <Spotlight
          openApp={openApp}
          toggleLaunchpad={toggleLaunchpad}
          toggleSpotlight={toggleSpotlight}
          btnRef={spotlightBtnRef as React.RefObject<HTMLDivElement>}
        />
      )}

      {/* Launchpad */}
      <Launchpad show={state.showLaunchpad} toggleLaunchpad={toggleLaunchpad} />

      {/* Notification Center */}
      <NotificationCenter
        show={state.showNotificationCenter}
        onClose={toggleNotificationCenter}
      />

      {/* Dock */}
      <Dock
        open={openApp}
        showApps={state.showApps}
        showLaunchpad={state.showLaunchpad}
        toggleLaunchpad={toggleLaunchpad}
        hide={state.hideDockAndTopbar}
      />

      {/* Context Menu */}
      <ContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        show={contextMenu.show}
        onClose={() => setContextMenu({ ...contextMenu, show: false })}
        openApp={openApp}
        onCreateFolder={createDesktopFolder}
      />
    </div>
  );
}
