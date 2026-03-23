import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import CustomerPage from './pages/CustomerPage';
import ManagerPage from './pages/ManagerPage';
import LoginPage from './pages/LoginPage';

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ minHeight: '100vh', background: '#0e1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#637080', fontFamily: 'Outfit, sans-serif' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Customer check-in — public */}
          <Route path="/" element={<CustomerPage />} />

          {/* Manager login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Manager portal — protected */}
          <Route path="/manager" element={
            <ProtectedRoute>
              <ManagerPage />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
