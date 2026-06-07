import {DOCK_ICONS} from "./appRegistry.tsx";
import {useWindowManager} from "./useWindowManager.ts";

export default function OpenAppsBar() {
    const {windows, restoreWindow, focusedId} = useWindowManager();
    const minimized = windows.filter((w) => w.minimized);

    if (minimized.length === 0) return null;

    return (
        <aside className="desktop-open-apps" aria-label="已最小化的应用">
            <div className="desktop-open-apps__title">已打开</div>
            <ul className="desktop-open-apps__list">
                {minimized.map((win) => {
                    const Icon = DOCK_ICONS[win.appId];
                    const active = focusedId === win.id;
                    return (
                        <li key={win.id}>
                            <button
                                type="button"
                                className={[
                                    "desktop-open-apps__item",
                                    active && "desktop-open-apps__item--active",
                                ]
                                    .filter(Boolean)
                                    .join(" ")}
                                title={win.title}
                                onClick={() => restoreWindow(win.id)}
                            >
                                {Icon ? (
                                    <span className="desktop-open-apps__icon">
                                        <Icon />
                                    </span>
                                ) : null}
                                <span className="desktop-open-apps__label">{win.title}</span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </aside>
    );
}
