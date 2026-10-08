import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/poppins/latin-800.css";
import "./style.css";
import { VoiceLab } from "./VoiceLab";

createRoot(document.getElementById("root")!).render(<React.StrictMode><VoiceLab /></React.StrictMode>);
