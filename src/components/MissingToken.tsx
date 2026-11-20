import "./MissingToken.css";

/** Shown instead of the map when VITE_MAPBOX_TOKEN is not set. */
export function MissingToken() {
  return (
    <section className="missing-token" role="alert" aria-labelledby="missing-token-title">
      <h1 id="missing-token-title">The campus map can't load</h1>
      <p>This site needs a public Mapbox token, and none is configured.</p>
      <ul>
        <li>
          <strong>Running locally:</strong> copy <code>.env.example</code> to <code>.env.local</code>, set{" "}
          <code>VITE_MAPBOX_TOKEN</code> to a public token that starts with <code>pk.</code>, then restart{" "}
          <code>npm run dev</code>.
        </li>
        <li>
          <strong>On Vercel:</strong> add <code>VITE_MAPBOX_TOKEN</code> under Project Settings, Environment Variables, and
          redeploy.
        </li>
      </ul>
    </section>
  );
}
