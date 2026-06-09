import React from "react";
import { apps, wallpapers } from "~/configs";
import { minMarginY } from "~/utils";
import type { MacActions } from "~/types";

interface DesktopState {
  showApps: {
    [key: string]: boolean;
  };
  appsZ: {
    [key: string]: number;
  };
  maxApps: {
    [key: string]: boolean;
  };
  minApps: {
    [key: string]: boolean;
  };
  maxZ: number;
  showLaunchpad: boolean;
  currentTitle: string;
  hideDockAndTopbar: boolean;
  spotlight: boolean;
  folders: {
    id: string;
    name: string;
    x?: number;
    y?: number;
    open?: boolean;
  }[];
  files: {
    id: string;
    name: string;
    icon?: string;
    folderId?: string;
    x?: number;
    y?: number;
  }[];
}

export default function Desktop(props: MacActions) {
  const initialState: DesktopState = {
    showApps: {},
    appsZ: {},
    maxApps: {},
    minApps: {},
    maxZ: 2,
    showLaunchpad: false,
    currentTitle: "Finder",
    hideDockAndTopbar: false,
    spotlight: false,
    folders: [],
    files: []
  };

  const [state, setState] = useState<DesktopState>(initialState);

  const [spotlightBtnRef, setSpotlightBtnRef] =
    useState<React.RefObject<HTMLDivElement> | null>(null);

  const { dark, brightness } = useStore((state) => ({
    dark: state.dark,
    brightness: state.brightness
  }));

  const getAppsData = (): void => {
    let showApps = {},
      appsZ = {},
      maxApps = {},
      minApps = {};

    apps.forEach((app) => {
      showApps = {
        ...showApps,
        [app.id]: !!app.show
      };
      appsZ = {
        ...appsZ,
        [app.id]: 2
      };
      maxApps = {
        ...maxApps,
        [app.id]: false
      };
      minApps = {
        ...minApps,
        [app.id]: false
      };
    });

    setState({ ...state, showApps, appsZ, maxApps, minApps });
  };

  useEffect(() => {
    getAppsData();
    // load folders from localStorage (if any)
    try {
      const raw = localStorage.getItem("desktop_folders");
      if (raw) {
        const folders = JSON.parse(raw) as DesktopState["folders"];
        setState((s) => ({ ...s, folders }) as DesktopState);
      }
    } catch (e) {
      // ignore parse errors
    }
  }, []);

  // persist folders whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("desktop_folders", JSON.stringify(state.folders || []));
      localStorage.setItem("desktop_files", JSON.stringify(state.files || []));
    } catch (e) {}
  }, [state.folders, state.files]);

  // keyboard shortcut: Cmd/Ctrl+Shift+N -> create new folder
  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const mod = isMac ? ev.metaKey : ev.ctrlKey;
      if (mod && ev.shiftKey && ev.key.toLowerCase() === "n") {
        ev.preventDefault();
        createFolder();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.folders]);

  const toggleLaunchpad = (target: boolean): void => {
    const r = document.querySelector(`#launchpad`) as HTMLElement;
    if (target) {
      r.style.transform = "scale(1)";
      r.style.transition = "ease-in 0.2s";
    } else {
      r.style.transform = "scale(1.1)";
      r.style.transition = "ease-out 0.2s";
    }

    setState({ ...state, showLaunchpad: target });
  };

  const toggleSpotlight = (): void => {
    setState({ ...state, spotlight: !state.spotlight });
  };

  const setWindowPosition = (id: string): void => {
    const r = document.querySelector(`#window-${id}`) as HTMLElement;
    const rect = r.getBoundingClientRect();
    r.style.setProperty(
      "--window-transform-x",
      // "+ window.innerWidth" because of the boundary for windows
      (window.innerWidth + rect.x).toFixed(1).toString() + "px"
    );
    r.style.setProperty(
      "--window-transform-y",
      // "- minMarginY" because of the boundary for windows
      (rect.y - minMarginY).toFixed(1).toString() + "px"
    );
  };

  const setAppMax = (id: string, target?: boolean): void => {
    const maxApps = state.maxApps;
    if (target === undefined) target = !maxApps[id];
    maxApps[id] = target;
    setState({
      ...state,
      maxApps: maxApps,
      hideDockAndTopbar: target
    });
  };

  const setAppMin = (id: string, target?: boolean): void => {
    const minApps = state.minApps;
    if (target === undefined) target = !minApps[id];
    minApps[id] = target;
    setState({
      ...state,
      minApps: minApps
    });
  };

  const minimizeApp = (id: string): void => {
    setWindowPosition(id);

    // get the corrosponding dock icon's position
    let r = document.querySelector(`#dock-${id}`) as HTMLElement;
    const dockAppRect = r.getBoundingClientRect();

    r = document.querySelector(`#window-${id}`) as HTMLElement;
    // const appRect = r.getBoundingClientRect();
    const posY = window.innerHeight - r.offsetHeight / 2 - minMarginY;
    // "+ window.innerWidth" because of the boundary for windows
    const posX = window.innerWidth + dockAppRect.x - r.offsetWidth / 2 + 25;

    // translate the window to that position
    r.style.transform = `translate(${posX}px, ${posY}px) scale(0.2)`;
    r.style.transition = "ease-out 0.3s";

    // add it to the minimized app list
    setAppMin(id, true);
  };

  // --- Folder support -------------------------------------------------
  const createFolder = (name?: string) => {
    const id = `folder-${Date.now()}`;
    const folderName = name || `New Folder`;
    const folders = [...(state.folders || []), { id, name: folderName, open: false }];
    setState({ ...state, folders });
  };

  const toggleFolderOpen = (id: string, target?: boolean) => {
    const folders = (state.folders || []).map((f) =>
      f.id === id ? { ...f, open: typeof target === "boolean" ? target : !f.open } : f
    );
    setState({ ...state, folders });
  };

  const renderFolderIcons = () => {
    return (state.folders || []).map((f, idx) => {
      return (
        <div
          key={`desktop-folder-${f.id}`}
          className="desktop-folder text-center cursor-default select-none"
          style={{ width: 84, margin: 12, display: "inline-block" }}
          onDoubleClick={() => toggleFolderOpen(f.id, true)}
        >
          <img src={`img/icons/folder.png`} alt="folder" style={{ width: 64 }} />
          <div
            className="text-xs mt-1"
            style={{
              width: 84,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}
          >
            {f.name}
          </div>
        </div>
      );
    });
  };

  const renderFolderWindows = () => {
    // simple folder windows that display the folder name; reuses AppWindow for consistency
    return (state.folders || []).map((f) => {
      if (!f.open) return <div key={`folder-window-${f.id}`} />;

      const props = {
        id: f.id,
        title: f.name,
        width: 480,
        height: 360,
        minWidth: 240,
        minHeight: 160,
        x: 120,
        y: 120,
        z: state.maxZ + 1,
        max: false,
        min: false,
        close: () => toggleFolderOpen(f.id, false),
        setMax: () => {},
        setMin: () => {},
        focus: () => toggleFolderOpen(f.id, true)
      } as any;

      const filesInFolder = (state.files || []).filter((file) => file.folderId === f.id);

      return (
        <AppWindow key={`folder-window-${f.id}`} {...props}>
          <div
            style={{ padding: 12 }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const fileId = e.dataTransfer.getData("application/x-desktop-file");
              if (fileId) moveFileToFolder(fileId, f.id);
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{f.name}</div>

            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {filesInFolder.length > 0 ? (
                filesInFolder.map((file) => (
                  <div
                    key={file.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/x-desktop-file", file.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    className="text-center cursor-default select-none"
                    style={{ width: 84, margin: 8 }}
                  >
                    <img
                      src={file.icon ?? "img/icons/file.png"}
                      alt={file.name}
                      style={{ width: 48 }}
                    />
                    <div
                      style={{
                        fontSize: 12,
                        marginTop: 6,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                    >
                      {file.name}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted">(empty)</div>
              )}
            </div>
          </div>
        </AppWindow>
      );
    });
  };

  const closeApp = (id: string): void => {
    setAppMax(id, false);
    const showApps = state.showApps;
    showApps[id] = false;
    setState({
      ...state,
      showApps: showApps,
      hideDockAndTopbar: false
    });
  };

  const openApp = (id: string): void => {
    // add it to the shown app list
    const showApps = state.showApps;
    showApps[id] = true;

    // move to the top (use a maximum z-index)
    const appsZ = state.appsZ;
    const maxZ = state.maxZ + 1;
    appsZ[id] = maxZ;

    // get the title of the currently opened app
    const currentApp = apps.find((app) => {
      return app.id === id;
    });
    if (currentApp === undefined) {
      throw new TypeError(`App ${id} is undefined.`);
    }

    setState({
      ...state,
      showApps: showApps,
      appsZ: appsZ,
      maxZ: maxZ,
      currentTitle: currentApp.title
    });

    const minApps = state.minApps;
    // if the app has already been shown but minimized
    if (minApps[id]) {
      // move to window's last position
      const r = document.querySelector(`#window-${id}`) as HTMLElement;
      r.style.transform = `translate(${r.style.getPropertyValue(
        "--window-transform-x"
      )}, ${r.style.getPropertyValue("--window-transform-y")}) scale(1)`;
      r.style.transition = "ease-in 0.3s";
      // remove it from the minimized app list
      minApps[id] = false;
      setState({ ...state, minApps });
    }
  };

  const renderAppWindows = () => {
    return apps.map((app) => {
      if (app.desktop && state.showApps[app.id]) {
        const props = {
          id: app.id,
          title: app.title,
          width: app.width,
          height: app.height,
          minWidth: app.minWidth,
          minHeight: app.minHeight,
          aspectRatio: app.aspectRatio,
          x: app.x,
          y: app.y,
          z: state.appsZ[app.id],
          max: state.maxApps[app.id],
          min: state.minApps[app.id],
          close: closeApp,
          setMax: setAppMax,
          setMin: minimizeApp,
          focus: openApp
        };

        return (
          <AppWindow key={`desktop-app-${app.id}`} {...props}>
            {app.content}
          </AppWindow>
        );
      } else {
        return <div key={`desktop-app-${app.id}`} />;
      }
    });
  };

  const moveFileToFolder = (fileId: string, folderId: string) => {
    const files = (state.files || []).map((f) =>
      f.id === fileId ? { ...f, folderId } : f
    );
    setState({ ...state, files });
  };

  const moveFileToDesktop = (fileId: string) => {
    const files = (state.files || []).map((f) =>
      f.id === fileId ? { ...f, folderId: undefined } : f
    );
    setState({ ...state, files });
  };

  const renderDesktopFiles = () => {
    return (state.files || [])
      .filter((file) => !file.folderId) // only files without a folderId
      .map((file) => (
        <div
          key={file.id}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("application/x-desktop-file", file.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          className="desktop-file"
        >
          <img src={file.icon ?? "img/icons/file.png"} alt={file.name} />
          <div>{file.name}</div>
        </div>
      ));
  };

  return (
    <div
      className="size-full overflow-hidden bg-center bg-cover"
      style={{
        backgroundImage: `url(${dark ? wallpapers.night : wallpapers.day})`,
        filter: `brightness( ${(brightness as number) * 0.7 + 50}% )`
      }}
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
      />

      {/* Desktop Icons (folders) */}
      <div
        className="desktop-icons absolute z-0"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => {
          e.preventDefault();
          const fileId = e.dataTransfer.getData("application/x-desktop-file");
          if (fileId) moveFileToDesktop(fileId);
        }}
        style={{ top: minMarginY + 24, left: 48, right: 48, padding: 12 }}
      >
        {renderFolderIcons()}
        {renderDesktopFiles()}
      </div>

      {/* Desktop Apps */}
      <div className="window-bound z-10 absolute" style={{ top: minMarginY }}>
        {renderAppWindows()}
        {renderFolderWindows()}
      </div>

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

      {/* Dock */}
      <Dock
        open={openApp}
        showApps={state.showApps}
        showLaunchpad={state.showLaunchpad}
        toggleLaunchpad={toggleLaunchpad}
        hide={state.hideDockAndTopbar}
      />
    </div>
  );
}
