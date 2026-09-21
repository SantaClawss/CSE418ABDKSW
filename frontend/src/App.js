import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './homepage/Navbar';
import HomePage from './homepage/Homepage';
import News from './News';
import Data from './Data';
import FAQ from './Faq';
import ViewProfile from "./profile/ViewProfile";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import CreateAccount from './pages/CreateAccount';
import SelfReport from './selfreports/self-report';
import AdminPage from './pages/AdminPage';
import MyReports from './selfreports/viewownreports';
import BiosecurityGuide from './pages/BiosecurityGuide';
import EducationPage from './pages/EducationPage';
import AllReports from './selfreports/allreports';
import Publications from './Publications';

const API_BASE =
  process.env.NODE_ENV === "production"
    ? "/CSE442/2026-Spring/cse-442c/backend/public/api/index.php"
    : "http://localhost:8000/api/index.php";

function PrivateRoute({ element }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    fetch(`${API_BASE}?r=checkSession`, { credentials: "include" })
      .then((res) => setStatus(res.ok ? "ok" : "unauth"))
      .catch(() => setStatus("unauth"));
  }, []);

  if (status === "checking") return null;
  if (status === "unauth") return <Navigate to="/login" replace />;
  return element;
}

function App() {
  return (
    <div>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/createAccount" element={<CreateAccount />} />

        {/* Protected routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/home" element={<PrivateRoute element={<HomePage />} />} />
        <Route path="/news" element={<PrivateRoute element={<News />} />} />
        <Route path="/data" element={<PrivateRoute element={<Data />} />} />
        <Route path="/faq" element={<PrivateRoute element={<FAQ />} />} />
        <Route path="/profile" element={<PrivateRoute element={<ViewProfile />} />} />
        <Route path="/education" element={<PrivateRoute element={<EducationPage />} />} />
        <Route path="/self-report" element={<PrivateRoute element={<SelfReport />} />} />
        <Route path="/admin" element={<PrivateRoute element={<AdminPage />} />} />
        <Route path="/my-reports" element={<PrivateRoute element={<MyReports />} />} />
        <Route path="/biosecurity" element={<PrivateRoute element={<BiosecurityGuide />} />} />
        <Route path="/allreports" element={<PrivateRoute element={<AllReports />} />} />
        <Route path="/publications" element={<PrivateRoute element={<Publications />} />} />
      </Routes>
    </div>
  );
}

export default App;
