import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Trash2, Copy, Pencil, Search, Sparkles, ExternalLink, X, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { deleteDesignProject, duplicateDesignProject, listDesignProjects, patchDesignProject } from '../lib/api.ts';
import { cn } from '../lib/utils.ts';
import type { DesignProjectStatus, DesignProjectSummary } from '../types.ts';

const STATUS_FILTERS: { label: string; value: DesignProjectStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Ready', value: 'ready' },
  { label: 'Archived', value: 'archived' },
];

export function SavedDesigns() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<DesignProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DesignProjectStatus | 'all'>('all');
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [brokenThumbnailIds, setBrokenThumbnailIds] = useState<Set<number>>(new Set());

  const loadProjects = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const results = await listDesignProjects({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search.trim() || undefined,
        ordering: '-updated_at',
      });
      setProjects(results);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load your saved designs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    void loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, statusFilter]);

  useEffect(() => {
    if (!user) return;
    const timeout = window.setTimeout(() => void loadProjects(), 300);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openProject = (project: DesignProjectSummary) => {
    navigate(`/customize?project=${project.id}`);
  };

  const startRename = (project: DesignProjectSummary) => {
    setRenamingId(project.id);
    setRenameDraft(project.name);
  };

  const confirmRename = async (project: DesignProjectSummary) => {
    const nextName = renameDraft.trim();
    setRenamingId(null);
    if (!nextName || nextName === project.name) return;

    setBusyId(project.id);
    try {
      const updated = await patchDesignProject(project.id, { name: nextName });
      setProjects((current) => current.map((p) => (p.id === project.id ? { ...p, name: updated.name } : p)));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not rename this design.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDuplicate = async (project: DesignProjectSummary) => {
    setBusyId(project.id);
    try {
      const duplicate = await duplicateDesignProject(project.id);
      await loadProjects();
      void duplicate;
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not duplicate this design.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (project: DesignProjectSummary) => {
    setBusyId(project.id);
    try {
      await deleteDesignProject(project.id);
      setProjects((current) => current.filter((p) => p.id !== project.id));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not delete this design.');
    } finally {
      setBusyId(null);
      setPendingDeleteId(null);
    }
  };


  const emptyState = useMemo(() => {
    if (search.trim() || statusFilter !== 'all') {
      return 'No saved designs match your filters.';
    }
    return "You haven't saved any designs yet.";
  }, [search, statusFilter]);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-32 text-center">
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <Layers className="text-gray-600" size={32} />
        </div>
        <h2 className="mb-4 text-3xl font-display font-bold uppercase tracking-widest text-white">Identity Required</h2>
        <p className="mx-auto mb-8 max-w-sm text-gray-500">Sign in to view and manage your saved designs.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full bg-neon-purple px-8 py-4 font-bold uppercase tracking-widest text-white transition-all hover:neon-glow-purple"
        >
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <header className="mb-12">
        <div className="mb-6 inline-flex items-center gap-2 rounded-sm border-l-4 border-neon-blue bg-neon-blue/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.4em] text-neon-blue">
          Personal Workspace
        </div>
        <h1 className="mb-4 text-5xl font-display font-black uppercase tracking-tighter text-white md:text-7xl">
          Saved <span className="italic font-light">Designs</span>
        </h1>
        <p className="max-w-xl text-sm uppercase tracking-wider leading-relaxed text-gray-500">
          Reopen, duplicate, or clean up the customizations you've saved.
        </p>
      </header>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name…"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-neon-blue"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={cn(
                'rounded-lg border px-4 py-2 text-[10px] font-extrabold uppercase tracking-widest transition-all',
                statusFilter === filter.value
                  ? 'border-neon-blue bg-neon-blue/10 text-neon-blue'
                  : 'border-white/10 bg-white/5 text-gray-400 hover:text-white'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neon-blue border-t-transparent" />
        </div>
      ) : loadError ? (
        <div className="glass-card border-neon-pink/30 bg-neon-pink/5 py-16 text-center">
          <p className="text-sm uppercase tracking-widest text-neon-pink">{loadError}</p>
          <button
            onClick={() => void loadProjects()}
            className="mt-6 rounded-full border border-neon-pink/30 px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-neon-pink hover:bg-neon-pink hover:text-white transition-all"
          >
            Retry
          </button>
        </div>
      ) : projects.length === 0 ? (
        <div className="glass-card border-dashed border-white/10 py-24 text-center">
          <Sparkles className="mx-auto mb-6 text-white/20" size={48} />
          <p className="mb-8 text-sm uppercase tracking-widest text-gray-500">{emptyState}</p>
          <Link to="/generator" className="font-bold uppercase tracking-[0.2em] text-neon-blue hover:underline">
            Start a New Design
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {projects.map((project) => (
              <motion.div
                layout
                key={project.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card group relative flex flex-col overflow-hidden border-white/10 transition-all hover:border-neon-blue/40"
              >
                <div className="relative h-48 w-full overflow-hidden bg-cyber-gray/40">
                  {(() => {
                    const thumbnailUrl = brokenThumbnailIds.has(project.id) ? '' : project.displayThumbnailUrl;
                    return thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt={project.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        onError={() =>
                          setBrokenThumbnailIds((prev) => {
                            if (prev.has(project.id)) return prev;
                            const next = new Set(prev);
                            next.add(project.id);
                            return next;
                          })
                        }
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-600">
                        <Layers size={40} />
                      </div>
                    );
                  })()}
                  <span
                    className={cn(
                      'absolute left-3 top-3 rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-widest',
                      project.status === 'draft' && 'bg-white/10 text-gray-300',
                      project.status === 'ready' && 'bg-neon-blue/20 text-neon-blue',
                      project.status === 'archived' && 'bg-white/5 text-gray-500'
                    )}
                  >
                    {project.status}
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-5">
                  {renamingId === project.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={renameDraft}
                        onChange={(event) => setRenameDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') void confirmRename(project);
                          if (event.key === 'Escape') setRenamingId(null);
                        }}
                        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-blue"
                      />
                      <button
                        onClick={() => void confirmRename(project)}
                        className="rounded-lg border border-emerald-500/30 p-2 text-emerald-400 hover:bg-emerald-500/10"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setRenamingId(null)}
                        className="rounded-lg border border-white/10 p-2 text-gray-400 hover:bg-white/5"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <h3 className="truncate text-lg font-display font-bold uppercase tracking-wider text-white">
                      {project.name}
                    </h3>
                  )}

                  <div className="space-y-1 text-[10px] uppercase tracking-widest text-gray-500">
                    <p>{project.product?.name || project.template.productType}</p>
                    <p>
                      {[project.selectedColor, project.selectedSize].filter(Boolean).join(' / ') || 'No variant selected'}
                    </p>
                    <p>{project.placementCount} part{project.placementCount === 1 ? '' : 's'} configured</p>
                    <p>Updated {new Date(project.updatedAt).toLocaleDateString()}</p>
                  </div>

                  <div className="mt-auto flex items-center gap-2 pt-3">
                    <button
                      onClick={() => openProject(project)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-cyber-black transition-all hover:bg-neon-blue hover:text-white"
                    >
                      <ExternalLink size={13} /> Open
                    </button>
                    <button
                      onClick={() => startRename(project)}
                      disabled={busyId === project.id}
                      title="Rename"
                      className="rounded-lg border border-white/10 p-2.5 text-gray-400 transition-all hover:border-white/20 hover:text-white disabled:opacity-50"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => void handleDuplicate(project)}
                      disabled={busyId === project.id}
                      title="Duplicate"
                      className="rounded-lg border border-white/10 p-2.5 text-gray-400 transition-all hover:border-white/20 hover:text-white disabled:opacity-50"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => setPendingDeleteId(project.id)}
                      disabled={busyId === project.id}
                      title="Delete"
                      className="rounded-lg border border-neon-pink/20 p-2.5 text-neon-pink/80 transition-all hover:border-neon-pink hover:text-neon-pink disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {pendingDeleteId === project.id && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-cyber-black/90 p-6 text-center backdrop-blur-sm">
                    <p className="text-xs uppercase tracking-widest text-white">Delete "{project.name}"?</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500">This can't be undone.</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => void handleDelete(project)}
                        className="rounded-lg bg-neon-pink px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-neon-pink/80"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setPendingDeleteId(null)}
                        className="rounded-lg border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-300 hover:bg-white/5"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
