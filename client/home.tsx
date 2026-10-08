import { createRoot, hydrateRoot } from "react-dom/client";
import Home from "../app/page";
import "../app/globals.css";

const root = document.getElementById("dumbdown-root")!;
if (root.firstElementChild) hydrateRoot(root, <Home />);
else createRoot(root).render(<Home />);
