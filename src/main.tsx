import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import networkData from "./data/network.json";
import type { FeatureCollection, LineString } from "geojson";
import type { NetworkProperties } from "./RouteNetwork.ts";

// Ensure the imported network data matches the expected type
const network = networkData as FeatureCollection<LineString, NetworkProperties>;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App network={network} />
  </React.StrictMode>
);
