import { hydrateRoot } from "react-dom/client";
import Home from "../app/page";
import "../app/globals.css";

hydrateRoot(document.getElementById("dumbdown-root")!, <Home />);
