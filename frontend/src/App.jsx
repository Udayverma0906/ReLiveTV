import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import HomePage from './pages/HomePage';
import TvPage from './pages/TvPage';
import RemotePage from './pages/RemotePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignuPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/tv"
            element={
              <ProtectedRoute>
                <TvPage />
              </ProtectedRoute>
            }
          />
          <Route path="/remote" element={<RemotePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;