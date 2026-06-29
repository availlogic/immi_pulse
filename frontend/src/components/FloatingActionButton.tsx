interface Props {
    onClick: () => void;
}

export function FloatingActionButton({ onClick }: Props) {
    return (
        <button className="fab" onClick={onClick} aria-label="Open filters">
            Filters
        </button>
    );
}