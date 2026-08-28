import React from 'react';
import { Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<HomePage />} /> 
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/news" element={<News />} />
        <Route path="/data" element={<Data />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/profile" element={<ViewProfile />} />
        <Route path="/education" element={<EducationPage />} />
        <Route path="/createAccount" element={<CreateAccount />} />
        <Route path="/self-report" element={<SelfReport />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/my-reports" element={<MyReports />} />
        <Route path="/biosecurity" element={<BiosecurityGuide />} />
        <Route path ="/allreports" element = {<AllReports/>} />
        <Route path="/publications" element={<Publications />} />
      </Routes>
    </div>
  );
}

export default App;
