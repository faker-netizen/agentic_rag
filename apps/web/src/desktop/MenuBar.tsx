import {Button} from "antd";
import {useNavigate} from "react-router-dom";
import {clearAuth} from "@/service/token.ts";

export default function MenuBar() {
    const navigate = useNavigate();

    return (
        <header className="desktop-menubar">
            <div className="desktop-menubar__brand">Design to Code</div>
            <div className="desktop-menubar__spacer" />
            <Button
                type="text"
                size="small"
                className="desktop-menubar__action"
                onClick={() => {
                    clearAuth();
                    navigate("/login", {replace: true});
                }}
            >
                登出
            </Button>
        </header>
    );
}
