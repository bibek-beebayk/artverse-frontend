import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Package2, Search, ShoppingBag, SlidersHorizontal, Shirt } from 'lucide-react';
import type { CollectionSummary, Product } from '../types.ts';
import { SmartImage, Pagination } from '../components/Common.tsx';
import { getMockupTemplates, getProductsPage, getShopCategories } from '../lib/api.ts';
import { formatStartingPrice } from '../lib/pricing.ts';
import { cn } from '../lib/utils.ts';

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 400;

const ORDERING_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Newest' },
  { value: 'starting_price', label: 'Price: Low to High' },
  { value: '-starting_price', label: 'Price: High to Low' },
  { value: 'name', label: 'Name: A to Z' },
  { value: '-name', label: 'Name: Z to A' },
];

/** Reads a param straight from the URL for initial state — the Shop catalogue's whole filter
 * state lives in the URL (search/category/ordering/page), so refreshing or sharing a link
 * preserves it. See section 4/24 of the Shop-catalogue redesign. */
function readParam(searchParams: URLSearchParams, key: string): string {
  return searchParams.get(key) ?? '';
}

export function Shop() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlSearch = readParam(searchParams, 'search');
  const urlCategory = readParam(searchParams, 'category');
  const urlProductType = readParam(searchParams, 'type');
  const urlOrdering = readParam(searchParams, 'ordering');
  const urlPage = Number(readParam(searchParams, 'page')) || 1;

  // Search has its own local, immediately-responsive state — typing shouldn't refetch or touch
  // browser history on every keystroke. It's debounced into the URL (and thus into the actual
  // fetch) below.
  const [searchInput, setSearchInput] = useState(urlSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [categories, setCategories] = useState<CollectionSummary[]>([]);
  // Populated from actual template data (getMockupTemplates()), never a hardcoded list — a
  // product type only ever appears here if at least one active template uses it, so the filter
  // can't offer a type the backend doesn't actually support.
  const [productTypes, setProductTypes] = useState<{ value: string; label: string }[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [count, setCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getShopCategories()
      .then(setCategories)
      .catch((categoriesError) => console.error('Failed to load shop categories:', categoriesError));

    getMockupTemplates()
      .then((templates) => {
        const seen = new Map<string, string>();
        for (const template of templates) {
          if (!seen.has(template.productType)) {
            seen.set(template.productType, template.productTypeDisplay);
          }
        }
        setProductTypes(
          Array.from(seen.entries())
            .map(([value, label]) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label))
        );
      })
      .catch((templatesError) => console.error('Failed to load product types:', templatesError));
  }, []);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    getProductsPage({
      page: urlPage,
      pageSize: PAGE_SIZE,
      search: urlSearch || undefined,
      category: urlCategory || undefined,
      productType: urlProductType || undefined,
      ordering: urlOrdering || undefined,
    })
      .then((response) => {
        if (isCancelled) return;
        setProducts(response.results);
        setCount(response.count);
        setTotalPages(response.totalPages);
      })
      .catch((loadError) => {
        if (isCancelled) return;
        console.error('Failed to load products:', loadError);
        setError('The shop is currently unavailable. Please try again shortly.');
        setProducts([]);
      })
      .finally(() => {
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [urlPage, urlSearch, urlCategory, urlProductType, urlOrdering]);

  // Debounce: local typing -> URL update (which triggers the fetch above) 400ms after the user
  // stops typing, and resets to page 1 (a new search shouldn't stay on page 4 of the old results).
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (searchInput) {
            next.set('search', searchInput);
          } else {
            next.delete('search');
          }
          next.delete('page');
          return next;
        },
        { replace: true }
      );
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const updateParam = (key: string, value: string) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      next.delete('page');
      return next;
    });
  };

  const goToPage = (page: number) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (page > 1) {
        next.set('page', String(page));
      } else {
        next.delete('page');
      }
      return next;
    });
    document.getElementById('shop-catalogue-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    if (urlSearch) chips.push({ key: 'search', label: `Search: "${urlSearch}"` });
    if (urlCategory) {
      const category = categories.find((c) => c.slug === urlCategory);
      chips.push({ key: 'category', label: `Category: ${category?.name ?? urlCategory}` });
    }
    if (urlProductType) {
      const type = productTypes.find((t) => t.value === urlProductType);
      chips.push({ key: 'type', label: `Type: ${type?.label ?? urlProductType}` });
    }
    if (urlOrdering) {
      const ordering = ORDERING_OPTIONS.find((o) => o.value === urlOrdering);
      if (ordering) chips.push({ key: 'ordering', label: `Sort: ${ordering.label}` });
    }
    return chips;
  }, [urlSearch, urlCategory, urlProductType, urlOrdering, categories, productTypes]);

  const clearFilter = (key: string) => {
    if (key === 'search') {
      setSearchInput('');
    }
    updateParam(key, '');
  };

  const handleSelectProduct = (product: Product) => {
    // Product selection behavior: the catalogue only ever returns active, sellable products
    // (see apps.shop.views._PUBLIC_PRODUCTS on the backend) — no client-side re-check needed
    // before navigating. No cart item, no saved design, and no design is chosen here; the
    // customization screen resolves the product's own first sellable variant and opens blank.
    navigate(`/customize/product/${product.slug}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
      <header className="mb-10" id="shop-catalogue-heading">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-black text-white uppercase tracking-tighter mb-3">
          Shop <span className="text-neon-pink neon-text-glow">Merch</span>
        </h1>
        <p className="text-gray-500 uppercase tracking-[0.25em] text-[10px] sm:text-xs font-bold">
          Browse products, then customize with your own design
        </p>
      </header>

      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <label htmlFor="shop-search" className="sr-only">
            Search products
          </label>
          <input
            id="shop-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search products..."
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-11 pr-4 text-sm text-white placeholder:text-gray-500 outline-none transition-all focus:border-neon-pink/50 focus:bg-white/10"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <div>
            <label htmlFor="shop-category" className="sr-only">
              Filter by category
            </label>
            <select
              id="shop-category"
              value={urlCategory}
              onChange={(event) => updateParam('category', event.target.value)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-gray-300 outline-none transition-all focus:border-neon-pink/50"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Shirt
              size={14}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <label htmlFor="shop-product-type" className="sr-only">
              Filter by product type
            </label>
            <select
              id="shop-product-type"
              value={urlProductType}
              onChange={(event) => updateParam('type', event.target.value)}
              className="rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-9 pr-4 text-xs font-bold uppercase tracking-widest text-gray-300 outline-none transition-all focus:border-neon-pink/50"
            >
              <option value="">All Types</option>
              {productTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <SlidersHorizontal
              size={14}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <label htmlFor="shop-ordering" className="sr-only">
              Sort products
            </label>
            <select
              id="shop-ordering"
              value={urlOrdering}
              onChange={(event) => updateParam('ordering', event.target.value)}
              className="rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-9 pr-4 text-xs font-bold uppercase tracking-widest text-gray-300 outline-none transition-all focus:border-neon-pink/50"
            >
              {ORDERING_OPTIONS.map((option) => (
                <option key={option.value || 'default'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {activeFilterChips.length > 0 && (
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Active filters:</span>
          {activeFilterChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => clearFilter(chip.key)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-gray-300 transition-all hover:border-neon-pink/40 hover:text-white"
            >
              {chip.label}
              <span aria-hidden="true">&times;</span>
              <span className="sr-only">Remove filter</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="glass-card border-white/10 p-16 text-center">
          <Loader2 size={28} className="mx-auto mb-4 animate-spin text-neon-pink" />
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-gray-500">Loading products</p>
        </div>
      ) : error ? (
        <div className="glass-card border-white/10 p-16 text-center text-sm text-neon-pink">{error}</div>
      ) : products.length === 0 ? (
        <div className="glass-card border-white/10 p-16 text-center">
          <Package2 size={32} className="mx-auto mb-4 text-gray-600" />
          <p className="text-sm font-bold uppercase tracking-widest text-white mb-2">No products found</p>
          <p className="text-xs text-gray-500 uppercase tracking-wider">
            {activeFilterChips.length > 0
              ? 'Try adjusting your search or filters.'
              : 'Check back soon — new products are on the way.'}
          </p>
        </div>
      ) : (
        <>
          <p className="mb-6 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            {count} product{count === 1 ? '' : 's'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => {
              const priceLabel = formatStartingPrice(product.startingPrice);
              const colourCount = product.availableColors?.length ?? 0;
              const sizeCount = product.availableSizes?.length ?? 0;

              return (
                <div
                  key={product.id}
                  className="group overflow-hidden rounded-3xl border border-white/10 bg-white/5 transition-all hover:border-neon-pink/35"
                >
                  <div className="aspect-square bg-cyber-black/70">
                    <SmartImage
                      src={product.thumbnailUrl || product.imageUrl}
                      alt={product.name}
                      className="w-full h-full"
                      imgClassName="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>

                  <div className="p-5">
                    <p className="text-[9px] uppercase tracking-[0.25em] text-neon-blue mb-1">{product.category}</p>
                    <h3 className="text-sm font-display font-black uppercase tracking-wide text-white line-clamp-2 mb-2">
                      {product.name}
                    </h3>

                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="text-lg font-display font-black text-white">
                        {priceLabel ?? 'Unavailable'}
                      </span>
                      {!product.isAvailable && (
                        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-amber-200">
                          Unavailable
                        </span>
                      )}
                    </div>

                    {(colourCount > 0 || sizeCount > 0) && (
                      <p className="mb-4 text-[9px] uppercase tracking-widest text-gray-500">
                        {colourCount > 0 ? `${colourCount} colour${colourCount === 1 ? '' : 's'}` : null}
                        {colourCount > 0 && sizeCount > 0 ? ' · ' : null}
                        {sizeCount > 0 ? `${sizeCount} size${sizeCount === 1 ? '' : 's'}` : null}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSelectProduct(product)}
                      disabled={!product.isAvailable}
                      className={cn(
                        'w-full flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all',
                        product.isAvailable
                          ? 'bg-white text-cyber-black hover:bg-neon-pink hover:text-white'
                          : 'cursor-not-allowed bg-white/5 text-gray-600'
                      )}
                    >
                      <ShoppingBag size={14} />
                      Customize
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <nav className="mt-10" aria-label="Product catalogue pagination">
            <Pagination currentPage={urlPage} totalPages={totalPages} onPageChange={goToPage} />
          </nav>
        </>
      )}
    </div>
  );
}
