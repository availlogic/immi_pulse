interface Props {
    jurisdictions: string[];
    tags: string[];
    jurisdictionNames: Record<string, string>;
    onRemoveJurisdiction?: (code: string) => void;
    onRemoveTag?: (tag: string) => void;
}

export function FilterBadges({ jurisdictions, tags, jurisdictionNames, onRemoveJurisdiction, onRemoveTag }: Props) {
    if (jurisdictions.length === 0 && tags.length === 0) {
        return (
            <div className="filter-badges" aria-label="Active filters">
                <span className="badge badge-empty">No active filters — showing global feed</span>
            </div>
        );
    }
    return (
        <div className="filter-badges" aria-label="Active filters">
            {jurisdictions.map((j) => (
                <span key={j} className="badge badge-jurisdiction">
                    {jurisdictionNames[j] ?? j}
                    {onRemoveJurisdiction && (
                        <button
                            type="button"
                            className="badge-remove"
                            aria-label={`Remove filter ${jurisdictionNames[j] ?? j}`}
                            onClick={() => onRemoveJurisdiction(j)}
                        >
                            ×
                        </button>
                    )}
                </span>
            ))}
            {tags.map((t) => (
                <span key={t} className="badge badge-tag">
                    {t}
                    {onRemoveTag && (
                        <button
                            type="button"
                            className="badge-remove"
                            aria-label={`Remove tag ${t}`}
                            onClick={() => onRemoveTag(t)}
                        >
                            ×
                        </button>
                    )}
                </span>
            ))}
        </div>
    );
}