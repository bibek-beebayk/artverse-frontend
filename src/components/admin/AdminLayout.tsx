/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { cn } from "../../lib/utils.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import { ADMIN_NAV } from "../../pages/admin/adminNav.ts";

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <Link to="/" className="flex items-center gap-2 border-b border-white/10 px-5 py-6">
        <ShieldCheck size={20} className="text-neon-purple" />
        <span className="font-display text-sm font-black uppercase tracking-[0.3em] text-white">
          Artverse Admin
        </span>
      </Link>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {ADMIN_NAV.map((section) => (
          <div key={section.heading} className="mb-5">
            <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500">
              {section.heading}
            </div>
            <div className="flex flex-col gap-1">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={`/admin/${item.path}`}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-all",
                      isActive
                        ? "bg-white text-cyber-black"
                        : "text-gray-400 hover:bg-white/5 hover:text-white",
                    )
                  }
                >
                  <item.icon size={15} />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    // h-screen + overflow-hidden on the shell (instead of min-h-screen) is what makes the
    // sidebar and main content each their own independent scroll container below — neither
    // participates in window-level scroll, so App.tsx's <ScrollToTop /> (window.scrollTo(0,0) on
    // every route change) can no longer visibly yank the sidebar/page back to the top on nav.
    <div className="flex h-screen overflow-hidden bg-cyber-black text-white">
      <aside className="hidden w-72 shrink-0 overflow-hidden border-r border-white/10 bg-cyber-gray/60 lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-cyber-black/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="glass-card relative flex w-72 flex-col overflow-hidden rounded-none border-y-0 border-l-0">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 hover:text-white"
            >
              <X size={15} />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-cyber-gray/40 px-5 py-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white lg:hidden"
          >
            <Menu size={16} />
          </button>
          <div className="min-w-0 flex-1" />
          <div className="flex items-center gap-3">
            <span className="hidden text-[10px] font-bold uppercase tracking-widest text-gray-400 sm:inline">
              {user?.email}
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-300 transition-colors hover:text-white"
            >
              <LogOut size={13} />
              Sign Out
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
