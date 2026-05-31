import AppWindow from "./AppWindow.tsx";
import {useWindowManager} from "./useWindowManager.ts";

export default function WindowLayer() {
    const {windows} = useWindowManager();

    return (
        <div className="window-layer" aria-live="polite">
            {windows.map((win, index) => (
                <AppWindow key={win.id} window={win} stackIndex={index} />
            ))}
        </div>
    );
}
