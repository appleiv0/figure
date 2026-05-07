import { Navigate, Route, Routes } from "react-router-dom";
import PageMeta from "../components/atoms/PageMeta";
import useStore from "../store";
import Layout from "../views/layout";
import Home from "../views/pages/Home";
import Landing from "../views/pages/Landing";
import MarketingLanding from "../views/pages/MarketingLanding";
import Register from "../views/pages/Register";
import Ending from "../views/pages/Stage/ending";
import Stage0Intro from "../views/pages/Stage/stage0Intro";
import Stage1Self from "../views/pages/Stage/stage1Self";
import Stage2WishFamily from "../views/pages/Stage/stage2WishFamily";
import Stage3FamilyAnimal from "../views/pages/Stage/stage3FamilyAnimal";
import Stage4FamilyWish from "../views/pages/Stage/stage4FamilyWish";
import Stage5FamilyView from "../views/pages/Stage/stage5FamilyView";
import Stage6Placement from "../views/pages/Stage/stage6Placement";
import Result from "../views/pages/Stage/result";
import AdminDashboard from "../views/pages/Admin";
import AdminSessions from "../views/pages/Admin/Sessions";
import AdminSessionDetail from "../views/pages/Admin/SessionDetail";
import MySessions from "../views/pages/MySessions";
import Test3D from "../views/pages/Test3D";
import SeedCompare from "../views/pages/Test3D/SeedCompare";
import BoardGame from "../views/pages/BoardGame";

const RequireSession = ({ children }: { children: React.ReactElement }) => {
  const token = sessionStorage.getItem('THERAPY_TOKEN');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const RequireGoogleLogin = ({ children }: { children: React.ReactElement }) => {
  try {
    const auth = JSON.parse(sessionStorage.getItem('counselorAuth') || '{}');
    if (auth.loginCode && !auth.isAdmin) return <Navigate to="/login" replace />;
  } catch {}
  return children;
};

export const Router = () => {
  const currentStep = useStore((state: any) => state.currentStep);

  const indexRoutes = [
    {
      path: "/",
      element: <Layout />,
      children: [
        { path: "/", element: <MarketingLanding /> },
        { path: "/login", element: <Landing /> },
        { path: "/register", element: <Register /> },
        {
          path: "/information",
          element: <Home />,
        },
        {
          path: "/stage0",
          element:
            currentStep === 0 ? (
              <Stage0Intro />
            ) : (
              <Navigate to={`/stage${currentStep}`} replace />
            ),
        },
        {
          path: "/stage1",
          element:
            currentStep === 1 ? (
              <Stage1Self />
            ) : (
              <Navigate to={`/stage${currentStep}`} replace />
            ),
        },
        {
          path: "/stage2",
          element:
            currentStep === 2 ? (
              <Stage2WishFamily />
            ) : (
              <Navigate to={`/stage${currentStep}`} replace />
            ),
        },
        {
          path: "/stage3",
          element:
            currentStep === 3 ? (
              <Stage3FamilyAnimal />
            ) : (
              <Navigate to={`/stage${currentStep}`} replace />
            ),
        },
        {
          path: "/stage4",
          element:
            currentStep === 4 ? (
              <Stage4FamilyWish />
            ) : (
              <Navigate to={`/stage${currentStep}`} replace />
            ),
        },
        {
          path: "/stage5",
          element:
            currentStep === 5 ? (
              <Stage5FamilyView />
            ) : (
              <Navigate to={`/stage${currentStep}`} replace />
            ),
        },
        {
          path: "/stage6",
          element:
            currentStep === 6 ? (
              <Stage6Placement />
            ) : (
              <Navigate to={`/stage${currentStep}`} replace />
            ),
        },
        {
          path: "/ending",
          element: <RequireSession><Ending /></RequireSession>,
        },
        {
          path: "/result",
          element: <RequireSession><Result /></RequireSession>,
        },
        {
          path: "/my-sessions",
          element: <RequireGoogleLogin><MySessions /></RequireGoogleLogin>,
        },
        {
          path: "/admin",
          element: <AdminDashboard />,
        },
        {
          path: "/admin/sessions",
          element: <AdminSessions />,
        },
        {
          path: "/admin/sessions/:receiptNo",
          element: <AdminSessionDetail />,
        },
        {
          path: "/test3d",
          element: <Test3D />,
        },
        {
          path: "/seeds",
          element: <SeedCompare />,
        },
        {
          path: "/boardgame",
          element: <BoardGame />,
        },
        {
          path: "*",
          element: <Navigate to={"/"} replace />,
        },
      ],
    },
  ];

  const routed = (route: any) => (
    <Route
      key={route.path}
      path={route.path}
      element={
        route.element && (
          <>
            {route.element}
            {route.title && <PageMeta title={route.title} />}
          </>
        )
      }
    >
      {route.children?.map((child: any) => routed(child))}
    </Route>
  );

  return <Routes>{indexRoutes.map((route) => routed(route))}</Routes>;
};
