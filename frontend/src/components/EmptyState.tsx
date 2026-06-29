interface Props {
    message: string;
}

export function EmptyState({ message }: Props) {
    return (
        <div className="empty-state" role="status">
            <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                style={{ marginBottom: 16 }}
            >
                <circle cx="12" cy="12" r="10" stroke="#1E40AF" strokeWidth="1.5" />
                <path d="M8 12h8" stroke="#1E40AF" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p>{message}</p>
        </div>
    );
}