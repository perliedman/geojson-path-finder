import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import network from "./data/network.json";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App network={network} />
  </React.StrictMode>
);
