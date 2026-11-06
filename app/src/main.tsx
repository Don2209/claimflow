import '@fontsource-variable/instrument-sans/wdth.css';
import '@fontsource-variable/big-shoulders-display/wght';
import '@fontsource/reenie-beanie/400';
import '@/styles/index.css';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { api, type User } from './api';
import { Shell } from './Shell';
import { Loading } from './ui';
import { Audit } from './pages/Audit';
import { ClaimFile } from './pages/ClaimFile';
import { Checklists } from './pages/Checklists';
import { Dashboard } from './pages/Dashboard';
import { Desk } from './pages/Desk';
import { Login } from './pages/Login';
import { NewClaim } from './pages/NewClaim';
import { Portal } from './pages/Portal';
import { Settings } from './pages/Settings';
import { SummaryPage } from './pages/SummaryPage';
import { Team } from './pages/Team';

function Staff() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  useEffect(() => {
    api<User>('/me').then(setUser).catch(() => setUser(null));
  }, []);
  if (user === undefined) return <div className="px-6"><Loading /></div>;
  if (!user) return <Login onSignedIn={setUser} />;
  const signOut = () => void api('/logout', { method: 'POST' }).finally(() => setUser(null));
  return (
    <Routes>
      <Route element={<Shell user={user} onSignOut={signOut} />}>
        <Route index element={<Desk />} />
        <Route path="claims/new" element={<NewClaim />} />
        <Route path="claims/:id" element={<ClaimFile />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="checklists" element={<Checklists />} />
        <Route path="team" element={<Team />} />
        <Route path="audit" element={<Audit />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<div className="py-16"><h1 className="font-display text-display-sm font-extrabold">That page is not here.</h1><Link className="text-link" to="/">Go to the claims desk</Link></div>} />
      </Route>
      <Route path="claims/:id/summary" element={<SummaryPage />} />
    </Routes>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/upload/:token" element={<Portal />} />
        <Route path="/*" element={<Staff />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
