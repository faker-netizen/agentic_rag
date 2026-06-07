import "./shell.css";

export type MacTrafficLightsProps = {
    onClose?: () => void;
    onMinimize?: () => void;
    closeLabel?: string;
    minimizeLabel?: string;
    className?: string;
};

export default function MacTrafficLights({
    onClose,
    onMinimize,
    closeLabel = "关闭",
    minimizeLabel = "最小化",
    className,
}: MacTrafficLightsProps) {
    return (
        <div className={["mac-traffic-lights", className].filter(Boolean).join(" ")}>
            {onClose ? (
                <button
                    type="button"
                    className="mac-traffic-light mac-traffic-light--close"
                    aria-label={closeLabel}
                    onClick={onClose}
                />
            ) : (
                <span className="mac-traffic-light mac-traffic-light--close" aria-hidden />
            )}
            {onMinimize ? (
                <button
                    type="button"
                    className="mac-traffic-light mac-traffic-light--minimize"
                    aria-label={minimizeLabel}
                    onClick={onMinimize}
                />
            ) : (
                <span className="mac-traffic-light mac-traffic-light--minimize" aria-hidden />
            )}
            <span className="mac-traffic-light mac-traffic-light--zoom" aria-hidden />
        </div>
    );
}
