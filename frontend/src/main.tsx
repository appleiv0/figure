import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./hooks/useAuth";
import { HistoryRouter } from "./routes/HistoryRouter";
import { history } from "./routes/history";
import "./sass/main.scss";
import { Router } from "./routes";

// 이전 세션 캐시 정리
sessionStorage.removeItem("abuse-therapy-store");
sessionStorage.removeItem("currentStep");
sessionStorage.removeItem("THERAPY_TOKEN");

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <HistoryRouter history={history} basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}>
        <AuthProvider>
          <Router />
        </AuthProvider>
      </HistoryRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
