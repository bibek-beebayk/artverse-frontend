import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Menu,
  X,
  Rocket,
  Instagram,
  Twitter,
  Youtube,
  LogOut,
  LogIn,
  ChevronDown,
  ShoppingCart,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { useCart } from '../context/CartContext.tsx';
import type { CollectionSummary } from '../types.ts';
import { getCollections } from '../lib/api.ts';

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'Gallery', path: '/gallery' },
  { name: 'Dream', path: '/generator' },
  { name: 'Favs', path: '/favorites' },
  { name: 'About', path: '/about' },
  { name: 'Shop', path: '/shop' },
  { name: 'Contact', path: '/contact' },
];

export function Navbar() {
  const { user, signIn, signOut, authError, clearAuthError } = useAuth();
  const { cart } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCollectionsDropdown, setShowCollectionsDropdown] = useState(false);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const loadCollections = async () => {
      try {
        setCollections(await getCollections());
      } catch (error) {
        console.error('Failed to load backend collections:', error);
        setCollections([]);
      }
    };

    void loadCollections();
  }, []);

  useEffect(() => {
    if (!authError) {
      return;
    }

    const timeout = window.setTimeout(() => {
      clearAuthError();
    }, 7000);

    return () => window.clearTimeout(timeout);
  }, [authError, clearAuthError]);

  useEffect(() => {
    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;

    if (isOpen) {
      body.style.overflow = 'hidden';
      documentElement.style.overflow = 'hidden';
    }

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  const totalCartItems = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4',
        scrolled ? 'bg-cyber-black/80 backdrop-blur-md border-b border-white/10' : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group text-white">
          <div className="w-10 h-10 bg-gradient-to-br from-neon-purple to-neon-blue rounded-lg flex items-center justify-center p-2 group-hover:rotate-12 transition-transform shadow-[0_0_15px_rgba(188,19,254,0.5)]">
            <Rocket className="text-white fill-white" />
          </div>
          <span className="font-display font-bold text-xl tracking-wider">
            ARTVERSE <span className="text-neon-purple">AI</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-white">
          <div className="flex items-center gap-6 lg:gap-8">
            <NavLink
              to="/"
              className={({ isActive }) =>
                cn(
                  'text-xs font-bold tracking-widest uppercase transition-colors hover:text-neon-blue pt-1',
                  isActive ? 'text-neon-purple' : 'text-gray-400'
                )
              }
            >
              Home
            </NavLink>

            <div
              className="relative"
              onMouseEnter={() => setShowCollectionsDropdown(true)}
              onMouseLeave={() => setShowCollectionsDropdown(false)}
            >
              <button
                onClick={() => setShowCollectionsDropdown(!showCollectionsDropdown)}
                className={cn(
                  'flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase transition-colors hover:text-neon-blue pt-1 focus:outline-none',
                  showCollectionsDropdown ? 'text-neon-purple' : 'text-gray-400'
                )}
              >
                Collections
                <ChevronDown size={12} className={cn('transition-transform duration-300', showCollectionsDropdown && 'rotate-180')} />
              </button>

              <AnimatePresence>
                {showCollectionsDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-80 bg-cyber-black/95 border border-white/10 rounded-2xl p-4 shadow-[0_0_30px_rgba(0,0,0,0.8)] backdrop-blur-xl z-50 grid grid-cols-1 gap-1"
                  >
                    <div className="px-3 py-2 border-b border-white/5 mb-1 flex items-center justify-between">
                      <span className="text-[9px] font-mono tracking-widest text-neon-blue uppercase">Stellar Drops</span>
                      <span className="text-[8px] font-mono text-gray-500 uppercase">{collections.length} Sets</span>
                    </div>

                    <div className="grid grid-cols-1 max-h-[350px] overflow-y-auto pr-1">
                      {collections.map((collection) => (
                        <Link
                          key={collection.id}
                          to={`/collections/${collection.slug}`}
                          onClick={() => setShowCollectionsDropdown(false)}
                          className="flex items-start gap-3 p-2 rounded-xl hover:bg-white/5 transition-all text-left"
                        >
                          <div className="w-12 h-12 rounded-lg shrink-0 border border-white/5 bg-white/[0.04] flex items-center justify-center text-neon-blue text-[11px] font-black uppercase tracking-[0.24em]">
                            {collection.name.slice(0, 2)}
                          </div>
                          <div>
                            <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-white hover:text-neon-blue transition-colors">
                              {collection.name}
                            </h4>
                            <p className="text-[9px] text-gray-500 line-clamp-1 mt-0.5 uppercase tracking-widest">
                              {collection.description || 'Backend collection'}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {navLinks.slice(1).map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  cn(
                    'text-xs font-bold tracking-widest uppercase transition-colors hover:text-neon-blue pt-1',
                    isActive ? 'text-neon-purple' : 'text-gray-400'
                  )
                }
              >
                {link.name}
              </NavLink>
            ))}
          </div>

          <div className="h-6 w-[1px] bg-white/10" />

          <div className="flex items-center gap-6">
            <Link
              to="/cart"
              className="relative p-2 text-gray-400 hover:text-neon-blue transition-colors flex items-center focus:outline-none"
            >
              <ShoppingCart size={18} />
              {totalCartItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 bg-neon-pink text-white text-[8px] font-black rounded-full flex items-center justify-center px-1 border border-cyber-black neon-glow-pink">
                  {totalCartItems}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 group focus:outline-none"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 group-hover:border-neon-purple transition-all">
                    <img
                      src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`}
                      alt={user.displayName || ''}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xs font-bold text-white uppercase tracking-widest hidden lg:block">
                    {user.displayName?.split(' ')[0]}
                  </span>
                </button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-4 w-48 glass-card border-white/10 p-2 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-white/5 mb-2">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Authorized Entity</p>
                        <p className="text-xs text-white truncate lowercase font-mono">{user.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          signOut();
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-gray-400 hover:text-neon-pink hover:bg-white/5 transition-all rounded-lg"
                      >
                        <LogOut size={14} />
                        Log Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={signIn}
                className="px-6 py-2 bg-white text-cyber-black text-[10px] font-black uppercase tracking-[0.2em] rounded-full hover:bg-neon-blue hover:text-white transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)]"
              >
                Login
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 md:hidden text-white">
          <Link
            to="/cart"
            className="p-2 text-gray-400 hover:text-neon-blue transition-colors relative flex items-center focus:outline-none"
          >
            <ShoppingCart size={18} />
            {totalCartItems > 0 && (
              <span className="absolute top-0 right-0 min-w-4 h-4 bg-neon-pink text-white text-[7px] font-black rounded-full flex items-center justify-center px-0.5 border border-cyber-black">
                {totalCartItems}
              </span>
            )}
          </Link>

          {!user && (
            <button
              onClick={signIn}
              className="rounded-full border border-white/15 bg-white px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.22em] text-cyber-black shadow-[0_0_12px_rgba(255,255,255,0.18)] transition-all hover:bg-neon-blue hover:text-white"
            >
              Login
            </button>
          )}

          {user && (
            <div className="w-8 h-8 rounded-full overflow-hidden border border-neon-purple">
              <img
                src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email || 'Artverse User'}`}
                alt={user.displayName || user.email || 'Authenticated user'}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <button className="text-white p-2" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 max-h-[calc(100vh-88px)] overflow-y-auto overscroll-contain bg-cyber-black/95 backdrop-blur-xl border-b border-white/10 p-6 flex flex-col gap-4 md:hidden z-50 text-white touch-pan-y"
          >
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
              {user ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-neon-purple shrink-0">
                      <img
                        src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || user.email || 'Artverse User'}`}
                        alt={user.displayName || user.email || 'Authenticated user'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-gray-500">Authorized Entity</p>
                      <p className="truncate text-xs font-bold text-white">
                        {user.displayName || user.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      signOut();
                      setIsOpen(false);
                    }}
                    className="rounded-full border border-neon-pink/25 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-neon-pink transition-all hover:bg-neon-pink hover:text-white"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-gray-500">Account Access</p>
                  <button
                    onClick={() => {
                      signIn();
                      setIsOpen(false);
                    }}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-cyber-black transition-all hover:bg-neon-blue hover:text-white"
                  >
                    <LogIn size={16} />
                    Login With Google
                  </button>
                </div>
              )}
            </div>

            <NavLink
              to="/"
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                cn(
                  'text-lg font-bold tracking-widest uppercase py-2',
                  isActive ? 'text-neon-purple' : 'text-gray-400'
                )
              }
            >
              Home
            </NavLink>

            <div className="py-2 border-b border-white/5">
              <span className="text-[10px] font-mono tracking-widest text-neon-blue uppercase block mb-3">Re Drop Collections</span>
              <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
                {collections.map((collection) => (
                  <Link
                    key={collection.id}
                    to={`/collections/${collection.slug}`}
                    onClick={() => setIsOpen(false)}
                    className="text-[10px] uppercase font-bold tracking-wider text-gray-400 hover:text-white py-1 block"
                  >
                    - {collection.name}
                  </Link>
                ))}
              </div>
            </div>

            {navLinks.slice(1).map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'text-lg font-bold tracking-widest uppercase py-2',
                    isActive ? 'text-neon-purple' : 'text-gray-400'
                  )
                }
              >
                {link.name}
              </NavLink>
            ))}

            <div className="h-[1px] bg-white/10 my-2" />

            {user ? (
              <button
                onClick={() => {
                  signOut();
                  setIsOpen(false);
                }}
                className="flex items-center gap-3 text-neon-pink font-bold uppercase tracking-widest text-sm py-2"
              >
                <LogOut size={18} />
                Logout Sessions
              </button>
            ) : (
              <button
                onClick={() => {
                  signIn();
                  setIsOpen(false);
                }}
                className="flex items-center gap-3 text-neon-blue font-bold uppercase tracking-widest text-sm py-2"
              >
                <LogIn size={18} />
                Login
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {authError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="max-w-7xl mx-auto mt-3"
          >
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-neon-pink/30 bg-neon-pink/10 px-4 py-3 text-neon-pink backdrop-blur-md">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] sm:tracking-[0.22em]">
                {authError}
              </p>
              <button
                onClick={clearAuthError}
                className="shrink-0 rounded-full border border-neon-pink/30 p-1 text-neon-pink hover:bg-neon-pink hover:text-white transition-all"
                aria-label="Dismiss login error"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="bg-cyber-gray border-t border-white/10 pt-16 pb-8 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-neon-purple to-neon-blue rounded flex items-center justify-center">
                <Rocket size={16} className="text-white fill-white" />
              </div>
              <span className="font-display font-bold text-xl tracking-wider text-white uppercase">
                Artverse <span className="text-neon-purple">AI</span>
              </span>
            </Link>
            <p className="text-gray-400 max-w-sm mb-6 leading-relaxed">
              Pushing the boundaries of imagination through AI-driven digital art.
              Exploring futuristic landscapes and cyberpunk realities one pixel at a time.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-neon-purple transition-all">
                <Instagram size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-neon-blue transition-all">
                <Twitter size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-neon-pink transition-all">
                <Youtube size={18} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold uppercase tracking-widest mb-6 border-l-2 border-neon-purple pl-4">Explore</h4>
            <ul className="space-y-4">
              <li><Link to="/gallery" className="text-gray-400 hover:text-neon-purple transition-colors">Gallery</Link></li>
              <li><Link to="/videos" className="text-gray-400 hover:text-neon-purple transition-colors">Videos</Link></li>
              <li><Link to="/shop" className="text-gray-400 hover:text-neon-purple transition-colors">Online Shop</Link></li>
              <li><Link to="/contact" className="text-gray-400 hover:text-neon-purple transition-colors">Collaborations</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold uppercase tracking-widest mb-6 border-l-2 border-neon-blue pl-4">Join Newsletter</h4>
            <p className="text-sm text-gray-400 mb-4 font-normal">Get notified about new drops and exclusive artwork.</p>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Email address"
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-neon-blue w-full"
              />
              <button className="bg-neon-blue text-cyber-black p-2 rounded-lg hover:bg-white transition-colors">
                <Rocket size={18} />
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500 uppercase tracking-widest">
          <p>&copy; 2024 Artverse AI. All rights reserved.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-white">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
