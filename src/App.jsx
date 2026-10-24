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
import Soon from './pages/Soon.jsx';

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
            {/* Built from scratch in the luxury design */}
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
            {/* Nav aliases to the luxury equivalents */}
            <Route path="/start" element={<Today />} />
            <Route path="/auto-draft" element={<Draft />} />
            <Route path="/contract-analyzer" element={<Contracts />} />
            <Route path="/firm-library" element={<Library />} />
            {/* Being migrated from the legacy app — rebuilt from scratch next. Placeholder (NOT legacy code). */}
            <Route path="/dashboard" element={<Soon title="Dashboard" />} />
            <Route path="/court-resources" element={<Soon title="Court Resources" blurb="Supreme Court, High Courts, district directories, judges and live cause lists — rebuilt in the new design." />} />
            <Route path="/war-room" element={<Soon title="Virtual Courtroom" blurb="Hearing prep, opening drafts and argument simulation — rebuilt in the new design." />} />
            <Route path="/practice" element={<Soon title="Practice" blurb="Your chambers’ practice management — clients, matters, RTI, reports — rebuilt in the new design." />} />
            <Route path="/practice/*" element={<Soon title="Practice" />} />
            <Route path="/vault" element={<Soon title="Case Vault" blurb="Every matter’s documents, folders and provenance — rebuilt in the new design." />} />
            <Route path="/document-hub" element={<Soon title="Document Hub" blurb="Filing, scanning and bundling your documents — rebuilt in the new design." />} />
            <Route path="/conflict-engine" element={<Soon title="Conflict Engine" blurb="Conflict-of-interest checks across your caseload — rebuilt in the new design." />} />
            <Route path="/legal-forms" element={<Soon title="Legal Forms" blurb="Fillable court forms and templates — rebuilt in the new design." />} />
            <Route path="*" element={<Today />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
