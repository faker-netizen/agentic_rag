import {FolderOutlined} from "@ant-design/icons";

const PLACEHOLDER_ICONS = [
    {id: "kb", label: "知识库", hint: "Finder 即将推出"},
    {id: "docs", label: "文档", hint: "Finder 即将推出"},
];

export default function DesktopSurface() {
    return (
        <div className="desktop-surface">
            <ul className="desktop-icons">
                {PLACEHOLDER_ICONS.map((item) => (
                    <li key={item.id} className="desktop-icon" title={item.hint}>
                        <div className="desktop-icon__glyph">
                            <FolderOutlined />
                        </div>
                        <span className="desktop-icon__label">{item.label}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
