import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import TvPage from './pages/TvPage';
import RemotePage from './pages/RemotePage';
import HomePage from './pages/HomePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tv" element={<TvPage />} />
        <Route path="/remote" element={<RemotePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;