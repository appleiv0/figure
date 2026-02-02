import { Navigate, Route, Routes } from "react-router-dom";
import PageMeta from "../components/atoms/PageMeta";
import useStore from "../store";
import Layout from "../views/layout";
import Home from "../views/pages/Home";
import Register from "../views/pages/Register";
import Ending from "../views/pages/Stage/ending";
import Stage0 from "../views/pages/Stage/stage0";
import Stage1 from "../views/pages/Stage/stage1";
import Stage2 from "../views/pages/Stage/stage2";
import Stage3 from "../views/pages/Stage/stage3";
import Stage4 from "../views/pages/Stage/stage4";
import Stage5 from "../views/pages/Stage/stage5";
import Stage6 from "../views/pages/Stage/stage6";
import Result from "../views/pages/Stage/result";
import AdminDashboard from "../views/pages/Admin";
import AdminSessions from "../views/pages/Admin/Sessions";
import AdminSessionDetail from "../views/pages/Admin/SessionDetail";

export const Router = () => {
  const currentStep = useStore((state: any) => state.currentStep);

  const indexRoutes = [
    {
      path: "/",
      element: <Layout />,
      children: [
        { path: "/", element: <Register /> },
        {
          path: "/information",
          element: <Home />,
        },
        {
          path: "/stage0",
          element:
            currentStep === 0 ? (
              <Stage0 />
            ) : (
              <Navigate to={`/stage${currentStep}`} replace />
            ),
        },
        {
          path: "/stage1",
          element:
            currentStep === 1 ? (
              <Stage1 />
            ) : (
              <Navigate to={`/stage${currentStep}`} replace />
            ),
        },
        {
          path: "/stage2",
          element:
            currentStep === 2 ? (
              <Stage2 />
            ) : (
              <Navigate to={`/stage${currentStep}`} replace />
            ),
        },
        {
          path: "/stage3",
          element:
            currentStep === 3 ? (
              <Stage3 />
            ) : (
              <Navigate to={`/stage${currentStep}`} replace />
            ),
        },
        {
          path: "/stage4",
          element:
            currentStep === 4 ? (
              <Stage4 />
            ) : (
              <Navigate to={`/stage${currentStep}`} replace />
            ),
        },
        {
          path: "/stage5",
          element:
            currentStep === 5 ? (
              <Stage5 />
            ) : (
              <Navigate to={`/stage${currentStep}`} replace />
            ),
        },
        {
          path: "/stage6",
          element:
            currentStep === 6 ? (
              <Stage6 />
            ) : (
              <Navigate to={`/stage${currentStep}`} replace />
            ),
        },
        {
          path: "/ending",
          element:
            currentStep === 6 ? (
              <Ending />
            ) : (
              <Navigate to={`/ending`} replace />
            ),
        },
        {
          path: "/result",
          element:
            currentStep === 6 ? <Result /> : <Navigate to={`/`} replace />,
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
