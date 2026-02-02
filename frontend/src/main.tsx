import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { AuthProvider } from "./hooks/useAuth";
import { HistoryRouter } from "./routes/HistoryRouter";
import { history } from "./routes/history";
import "./sass/main.scss";
import { Router } from "./routes";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HistoryRouter history={history}>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </HistoryRouter>
  </React.StrictMode>
);
