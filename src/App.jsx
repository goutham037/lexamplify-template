import { lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeContext } from './context/ThemeContext.jsx';
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

// The rest of the production product — already backend-wired components — mounted
// into the luxury shell so the full navigation works, not just the 8 luxury pages.
const StartPage = lazy(() => import('./components/StartPage'));
const DashboardView = lazy(() => import('./components/DashboardView'));
const ContractAnalyzer = lazy(() => import('./components/ContractAnalyzer'));
const AutoDraftWorkspace = lazy(() => import('./components/AutoDraftWorkspace'));
const CourtResources = lazy(() => import('./components/CourtResources'));
const WarRoomView = lazy(() => import('./components/WarRoomView'));
const PracticeApp = lazy(() => import('./components/practice/PracticeApp.jsx'));
const CaseWorkspace = lazy(() => import('./components/CaseWorkspace'));
const CaseVault = lazy(() => import('./components/CaseVault'));
const DocumentViewer = lazy(() => import('./components/DocumentViewer'));
const DocumentHub = lazy(() => import('./components/dochub/DocumentHub.jsx'));
const ConflictEngine = lazy(() => import('./components/ConflictEngine'));
const ConflictCheck = lazy(() => import('./components/ConflictCheck'));
const FirmLibrary = lazy(() => import('./components/FirmLibrary'));
const FormTemplateLibrary = lazy(() => import('./components/FormTemplateLibrary'));

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
      {/* No-op theme context: a few mounted components call useTheme(), but the real
          theme is driven by the luxury useSettings store (data-theme). This satisfies
          useTheme without letting the old provider clobber data-theme. */}
      <ThemeContext.Provider value={{ theme: 'light', toggleTheme: () => {} }}>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Protected><Shell /></Protected>}>
              {/* Luxury pages */}
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
              {/* Full product screens */}
              <Route path="/start" element={<StartPage />} />
              <Route path="/dashboard" element={<DashboardView />} />
              <Route path="/contract-analyzer" element={<ContractAnalyzer />} />
              <Route path="/analyzer" element={<ContractAnalyzer />} />
              <Route path="/auto-draft" element={<AutoDraftWorkspace />} />
              <Route path="/court-resources" element={<CourtResources />} />
              <Route path="/war-room" element={<WarRoomView />} />
              <Route path="/practice/*" element={<PracticeApp />} />
              <Route path="/vault" element={<CaseWorkspace />} />
              <Route path="/case/:caseId" element={<CaseVault />} />
              <Route path="/case/:caseId/doc/:docId" element={<DocumentViewer />} />
              <Route path="/document-hub" element={<DocumentHub />} />
              <Route path="/conflict-engine" element={<ConflictEngine />} />
              <Route path="/check-conflicts" element={<ConflictCheck />} />
              <Route path="/firm-library" element={<FirmLibrary />} />
              <Route path="/legal-forms" element={<FormTemplateLibrary />} />
              <Route path="*" element={<Today />} />
            </Route>
          </Routes>
        </HashRouter>
      </ThemeContext.Provider>
    </AuthProvider>
  );
}
