import type {PdfBullet, PdfCitation} from "@/service/chatpdfTypes.ts";

type SummaryBulletsProps = {
    bullets: PdfBullet[];
    citations: PdfCitation[];
    onCitationClick: (citation: PdfCitation) => void;
};

function citationById(citations: PdfCitation[], id: number): PdfCitation | undefined {
    return citations.find((c) => c.id === id);
}

export default function SummaryBullets({bullets, citations, onCitationClick}: SummaryBulletsProps) {
    return (
        <ul className="chatpdf-summary__list">
            {bullets.map((b, i) => (
                <li key={`${i}-${b.text.slice(0, 24)}`} className="chatpdf-summary__item">
                    <span>{b.text}</span>
                    {b.citeIds.map((id) => {
                        const c = citationById(citations, id);
                        if (!c) return null;
                        return (
                            <button
                                key={id}
                                type="button"
                                className="chatpdf-cite-link"
                                onClick={() => onCitationClick(c)}
                            >
                                [{id}]
                            </button>
                        );
                    })}
                </li>
            ))}
        </ul>
    );
}
