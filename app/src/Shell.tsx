import { useEffect, useState, type ReactNode } from 'react';
import { BarChart3, FolderOpen, History, ListChecks, LogOut, Menu, Settings, Users, X } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { LogoMark } from '@/components/Logo';
import { cn } from '@/lib/cn';
import { api, type Meta, type User } from './api';
import { Notice } from './ui';

export type ShellContext = { user: User; meta: Meta; reloadMeta: () => void };

function Item({ to, icon, children, onClick }: { to: string; icon: ReactNode; children: ReactNode; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        cn('flex min-h-11 items-center gap-3 rounded-md px-3 text-small font-semibold transition-colors', isActive ? 'bg-primary text-on-primary' : 'text-fg hover:bg-surface')
      }
    >
      {icon}
      {children}
    </NavLink>
  );
}

export function Shell({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [open, setOpen] = useState(false);
  const reloadMeta = () => void api<Meta>('/meta').then(setMeta).catch(() => undefined);
  useEffect(reloadMeta, []);
  const close = () => setOpen(false);
  const icon = 'size-[1.15rem] shrink-0';

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15.5rem_1fr]">
      <header className="ink sticky top-0 z-30 flex items-center justify-between bg-canvas px-4 py-2.5 text-fg lg:hidden">
        <span className="inline-flex items-center gap-2 font-display text-[1.4rem] font-extrabold"><LogoMark /> ClaimsFlow</span>
        <button type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)} className="grid size-11 place-items-center rounded-md hover:bg-surface">
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </header>
      <aside className={cn('ink z-20 flex-col bg-canvas p-3 text-fg lg:sticky lg:top-0 lg:flex lg:h-dvh', open ? 'flex' : 'hidden')}>
        <span className="mb-5 mt-1 hidden items-center gap-2 px-2 font-display text-[1.625rem] font-extrabold lg:inline-flex"><LogoMark /> ClaimsFlow</span>
        <nav aria-label="Main" className="grid gap-1">
          <Item to="/" onClick={close} icon={<FolderOpen className={icon} aria-hidden="true" />}>Claims desk</Item>
          <Item to="/dashboard" onClick={close} icon={<BarChart3 className={icon} aria-hidden="true" />}>Where files are stuck</Item>
          <Item to="/checklists" onClick={close} icon={<ListChecks className={icon} aria-hidden="true" />}>Checklists</Item>
          {user.role === 'manager' && (
            <>
              <Item to="/team" onClick={close} icon={<Users className={icon} aria-hidden="true" />}>Team</Item>
              <Item to="/audit" onClick={close} icon={<History className={icon} aria-hidden="true" />}>Audit trail</Item>
            </>
          )}
          <Item to="/settings" onClick={close} icon={<Settings className={icon} aria-hidden="true" />}>Settings</Item>
        </nav>
        <div className="mt-6 border-t border-line pt-3 lg:mt-auto">
          <p className="truncate px-3 text-small font-semibold">{user.name}</p>
          <p className="truncate px-3 text-caption text-muted">{user.role === 'manager' ? 'Manager' : 'Handler'}</p>
          <button type="button" onClick={onSignOut} className="mt-2 flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-small hover:bg-surface">
            <LogOut className={icon} aria-hidden="true" /> Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 bg-sunken/60 px-4 py-6 sm:px-6 lg:px-9 lg:py-8">
        <div className="mx-auto max-w-[84rem]">
          {meta && !meta.ai && (
            <div className="mb-5">
              <Notice>
                <strong>The AI is not connected yet.</strong> Documents are stored safely and will wait in the queue, but nothing is read until a manager adds the key on the server.
              </Notice>
            </div>
          )}
          {meta?.freeAiPlan && (
            <div className="mb-5">
              <Notice>
                <strong>Demo mode: fictional documents only.</strong> This runs on a free AI plan, where the AI provider's reviewers may read what is uploaded. Do not upload real claims.
              </Notice>
            </div>
          )}
          {meta && <Outlet context={{ user, meta, reloadMeta } satisfies ShellContext} />}
        </div>
      </main>
    </div>
  );
}
