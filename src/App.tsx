import { getMapboxToken } from "./lib/config";
import { MissingToken } from "./components/MissingToken";
import "./App.css";

export function App({ token = getMapboxToken() }: { token?: string | null }) {
  if (!token) return <MissingToken />;

  return (
    <div className="app">
      <main className="app-main" aria-label="Campus tour map">
        <p className="app-placeholder">Map coming in Sprint 1.</p>
      </main>
    </div>
  );
}
