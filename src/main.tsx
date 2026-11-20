import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { StudyGuide } from "./guide/StudyGuide";
import { viewFor } from "./lib/view";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>{viewFor(window.location.search) === "study-guide" ? <StudyGuide /> : <App />}</StrictMode>,
);
