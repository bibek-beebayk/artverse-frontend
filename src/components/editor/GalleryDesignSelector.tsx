import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Loader2, Image as ImageIcon, Check } from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { SmartImage } from '../Common.tsx';
import type { Artwork, CollectionSummary } from '../../types.ts';

interface GalleryDesignSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  categories: CollectionSummary[];
  ordering: string;
  onOrderingChange: (value: string) => void;
  loading: boolean;
  error: string | null;
  artworks: Artwork[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isArtworkSelected: (artwork: Artwork) => boolean;
  onSelectArtwork: (artwork: Artwork) => void;
}

/** "Choose from Gallery" selector (section 7/9) — paginated, searchable, category/ordering
 * filterable, admin-uploaded designs only (see apps.gallery's public ArtworkListView — private
 * user uploads never appear here). Applying a selection never navigates away from customization.
 * Purely presentational — Customization.tsx owns the fetch/filter state and the actual apply
 * (routed through the shared replacement-confirmation path, same as Upload/AI). */
export function GalleryDesignSelector({
  isOpen,
  onClose,
  searchInput,
  onSearchInputChange,
  category,
  onCategoryChange,
  categories,
  ordering,
  onOrderingChange,
  loading,
  error,
  artworks,
  page,
  totalPages,
  onPageChange,
  isArtworkSelected,
  onSelectArtwork,
}: GalleryDesignSelectorProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-cyber-black/85 px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gallery-selector-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape') onClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="glass-card relative flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden border-white/15 p-0"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h3 id="gallery-selector-title" className="text-lg font-display font-black uppercase tracking-widest text-white">
                Choose from Gallery
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close gallery selector"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-300 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 border-b border-white/10 px-6 py-4">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <label htmlFor="gallery-selector-search" className="sr-only">
                  Search gallery designs
                </label>
                <input
                  id="gallery-selector-search"
                  type="search"
                  value={searchInput}
                  onChange={(event) => onSearchInputChange(event.target.value)}
                  placeholder="Search designs..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-gray-500 outline-none focus:border-neon-pink/50"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <label htmlFor="gallery-selector-category" className="sr-only">
                  Filter by category
                </label>
                <select
                  id="gallery-selector-category"
                  value={category}
                  onChange={(event) => onCategoryChange(event.target.value)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-300 outline-none focus:border-neon-pink/50"
                >
                  <option value="">All Categories</option>
                  {categories.map((option) => (
                    <option key={option.slug} value={option.slug}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <label htmlFor="gallery-selector-ordering" className="sr-only">
                  Sort designs
                </label>
                <select
                  id="gallery-selector-ordering"
                  value={ordering}
                  onChange={(event) => onOrderingChange(event.target.value)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-300 outline-none focus:border-neon-pink/50"
                >
                  <option value="-created_at">Newest</option>
                  <option value="created_at">Oldest</option>
                  <option value="title">Name A-Z</option>
                  <option value="-title">Name Z-A</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 size={24} className="animate-spin text-neon-pink" />
                </div>
              ) : error ? (
                <div className="flex h-full items-center justify-center text-sm text-neon-pink">{error}</div>
              ) : artworks.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-gray-500">
                  <ImageIcon size={28} className="mb-3" />
                  <p className="text-xs font-bold uppercase tracking-widest">No designs found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {artworks.map((artwork) => {
                    const isSelected = isArtworkSelected(artwork);
                    return (
                      <button
                        key={artwork.id}
                        type="button"
                        onClick={() => onSelectArtwork(artwork)}
                        aria-current={isSelected ? 'true' : undefined}
                        className={cn(
                          'group overflow-hidden rounded-2xl border bg-white/5 text-left transition-all',
                          isSelected ? 'border-neon-pink shadow-[0_0_0_1px_rgba(255,0,255,0.4)]' : 'border-white/10 hover:border-neon-pink/40'
                        )}
                      >
                        <div className="relative aspect-square bg-cyber-black/60">
                          <SmartImage
                            src={artwork.thumbnailUrl || artwork.imageUrl}
                            alt={artwork.title}
                            className="w-full h-full"
                            imgClassName="w-full h-full object-cover transition-transform group-hover:scale-105"
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-neon-pink text-white">
                              <Check size={13} />
                            </div>
                          )}
                        </div>
                        <p className="truncate px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-300">
                          {artwork.title}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 border-t border-white/10 px-6 py-4">
                <button
                  type="button"
                  onClick={() => onPageChange(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
