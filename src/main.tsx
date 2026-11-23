import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { StudyGuide } from "./guide/StudyGuide";
import { EditMode } from "./admin/EditMode";
import { viewFor } from "./lib/view";
import "./styles/global.css";

const view = viewFor(window.location.search);

createRoot(document.getElementById("root")!).render(
  <StrictMode>{view === "study-guide" ? <StudyGuide /> : view === "edit" ? <EditMode /> : <App />}</StrictMode>,
);
