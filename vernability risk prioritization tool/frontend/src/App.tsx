import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { MainLayout } from './components/layout/MainLayout';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Vulnerabilities } from './pages/Vulnerabilities';
import { VulnerabilityDetail } from './pages/VulnerabilityDetail';
import { Assets } from './pages/Assets';
import { AssetDetail } from './pages/AssetDetail';
import { RiskPrioritization } from './pages/RiskPrioritization';
import { Remediation } from './pages/Remediation';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <Routes>
              {/* Main Application Layout (Direct access without login barrier) */}
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="vulnerabilities" element={<Vulnerabilities />} />
                <Route path="vulnerabilities/:id" element={<VulnerabilityDetail />} />
                <Route path="assets" element={<Assets />} />
                <Route path="assets/:id" element={<AssetDetail />} />
                <Route path="risk-prioritization" element={<RiskPrioritization />} />
                <Route path="remediation" element={<Remediation />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* Redirect any legacy auth routes directly to workspace */}
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/register" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
