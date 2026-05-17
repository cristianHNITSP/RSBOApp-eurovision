import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from '../pages/LandingPage/LandingPage.jsx';
import LoginPage from '../pages/LoginPage/LoginPage.jsx';
import AppPage from '../pages/AppPage/AppPage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/app/*"
        element={
          <ProtectedRoute>
            <AppPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);

export default AppRouter;
