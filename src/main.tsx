import React from "react";
import {lazy, Suspense} from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import "./index.css";
const LoginPage   = lazy(() => import("./pages/LoginPage"));
const SignUpPage  = lazy(() => import("./pages/SignUpPage"));
const ChatLayout  = lazy(() => import("./pages/ChatLayout"));
const JoinPage    = lazy(() => import("./pages/JoinPage"));
import ProtectedRoute from "./routes/ProtectedRoute";
import AppLoader from "./components/Apploader";

/* Removed: Health check on tab visibility - unnecessary network traffic */

const router = createBrowserRouter([
  { path: "/", element: <LoginPage /> },
  { path: "/signup", element: <SignUpPage /> },
  { path: "/join", element: <JoinPage /> },
  {
    path: "/chat",
    element: (
      <ProtectedRoute>
        <ChatLayout />
      </ProtectedRoute>
    ),
  },
  { path: "*", element: <Navigate to="/" replace /> }
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Suspense fallback={<AppLoader />}>
    <RouterProvider router={router} />
    </Suspense>
  </React.StrictMode>
);
