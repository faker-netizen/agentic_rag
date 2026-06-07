import "./home.css";

export default function Home() {
    return (
        <div className="home-page">
            <div className="home-page__hero">
                <h1 className="home-page__title">Design to Code</h1>
                <p className="home-page__desc">
                    macOS 风格桌面壳上的 AI 工作台——聊天、知识库、文档阅读与更多工具。
                </p>
            </div>
            <div className="home-page__cards">
                <div className="home-page__card">
                    <div className="home-page__card-label">聊天</div>
                    <div className="home-page__card-value">RAG 对话</div>
                </div>
                <div className="home-page__card">
                    <div className="home-page__card-label">知识库</div>
                    <div className="home-page__card-value">文档管理</div>
                </div>
                <div className="home-page__card">
                    <div className="home-page__card-label">桌面</div>
                    <div className="home-page__card-value">Dock 应用</div>
                </div>
            </div>
        </div>
    );
}
