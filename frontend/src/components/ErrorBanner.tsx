interface Props {
    message: string;
    onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: Props) {
    return (
        <div className="error-banner" role="alert">
            <span>{message}</span>
            {onRetry && (
                <button
                    className="btn btn-secondary"
                    style={{ marginLeft: 16 }}
                    onClick={onRetry}
                >
                    Retry
                </button>
            )}
        </div>
    );
}