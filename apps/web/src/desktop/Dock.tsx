import {message} from "antd";
import {DOCK_APPS, DOCK_ICONS} from "./appRegistry.tsx";
import {useWindowManager} from "./useWindowManager.ts";
import type {AppId} from "./types.ts";

export default function Dock() {
    const {openApp, isAppOpen} = useWindowManager();

    const onDockClick = (appId: AppId, available: boolean) => {
        if (!available) {
            message.info("即将推出");
            return;
        }
        openApp(appId);
    };

    return (
        <footer className="desktop-dock" role="toolbar" aria-label="应用坞">
            <div className="desktop-dock__inner">
                {DOCK_APPS.map((app) => {
                    const Icon = DOCK_ICONS[app.id];
                    if (!Icon) return null;
                    const running = isAppOpen(app.id);
                    return (
                        <button
                            key={app.id}
                            type="button"
                            className={[
                                "desktop-dock__item",
                                !app.available && "desktop-dock__item--disabled",
                                running && "desktop-dock__item--running",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            title={app.available ? app.label : `${app.label}（即将推出）`}
                            onClick={() => onDockClick(app.id, app.available)}
                        >
                            <span className="desktop-dock__icon">
                                <Icon />
                            </span>
                            <span className="desktop-dock__label">{app.label}</span>
                            {running && <span className="desktop-dock__dot" aria-hidden />}
                        </button>
                    );
                })}
            </div>
        </footer>
    );
}
