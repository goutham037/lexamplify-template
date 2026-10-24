import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Shell from './shell/Shell.jsx';
import Today from './pages/Today.jsx';
import Matters from './pages/Matters.jsx';
import MatterDetail from './pages/MatterDetail.jsx';
import Draft from './pages/Draft.jsx';
import DraftEditor from './pages/DraftEditor.jsx';
import Research from './pages/Research.jsx';
import Contracts from './pages/Contracts.jsx';
import ContractDetail from './pages/ContractDetail.jsx';
import Calendar from './pages/Calendar.jsx';
import Library from './pages/Library.jsx';
import Settings from './pages/Settings.jsx';
import Login from './pages/Login.jsx';

// Gate the whole shell behind a real session. While the cookie is being verified
// (GET /api/auth/me) we show a calm splash; a verified-logged-out user goes to /login.
function Protected({ children }) {
  const { user, isInitializing } = useAuth();
  if (isInitializing) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)', color: 'var(--muted)', fontFamily: 'var(--font-serif)', fontSize: 16 }}>
        Opening your chambers…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Protected><Shell /></Protected>}>
            <Route path="/" element={<Today />} />
            <Route path="/matters" element={<Matters />} />
            <Route path="/matters/:id" element={<MatterDetail />} />
            <Route path="/draft" element={<Draft />} />
            <Route path="/draft/:id" element={<DraftEditor />} />
            <Route path="/research" element={<Research />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/contracts/:id" element={<ContractDetail />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/library" element={<Library />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Today />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
