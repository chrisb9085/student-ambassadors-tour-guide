import "./MapControls.css";

type Props = {
  onResetView: () => void;
  onShowRoute: () => void;
  disabled?: boolean;
};

/** Camera buttons. Each is a 48 px target with a visible label, not just an icon. */
export function MapControls({ onResetView, onShowRoute, disabled = false }: Props) {
  return (
    <div className="map-controls" role="group" aria-label="Map view">
      <button type="button" className="btn btn-secondary" onClick={onShowRoute} disabled={disabled}>
        <RouteIcon />
        Whole route
      </button>
      <button type="button" className="btn btn-secondary" onClick={onResetView} disabled={disabled}>
        <ResetIcon />
        Reset view
      </button>
    </div>
  );
}

function RouteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v4h4" />
    </svg>
  );
}
