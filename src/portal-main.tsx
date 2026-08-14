import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PortalApp } from "./portal/PortalApp";
import "katex/dist/katex.min.css";
import "./styles/portal-entry.css";

document.body.classList.add("mod-macos", "styled-scrollbars");

const root = document.getElementById("root");
if (!root) throw new Error("Granite portal: #root not found in index.html");

createRoot(root).render(<StrictMode><PortalApp /></StrictMode>);
