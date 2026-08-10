/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy, useEffect, useState, type ComponentType } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Link, useLocation } from 'react-router-dom';
import { LogIn, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import { Layout } from './components/Common.tsx';
import { useAuth } from './context/AuthContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { CartProvider } from './context/CartContext.tsx';
import { Customization } from './pages/Customization.tsx';

const Home = lazy(() => import('./pages/Home.tsx').then((module) => ({ default: module.Home })));
const Gallery = lazy(() => import('./pages/Gallery.tsx').then((module) => ({ default: module.Gallery })));
const Videos = lazy(() => import('./pages/Videos.tsx').then((module) => ({ default: module.Videos })));
const About = lazy(() => import('./pages/About.tsx').then((module) => ({ default: module.About })));
const Contact = lazy(() => import('./pages/Contact.tsx').then((module) => ({ default: module.Contact })));
const Shop = lazy(() => import('./pages/Shop.tsx').then((module) => ({ default: module.Shop })));
const Favorites = lazy(() => import('./pages/Favorites.tsx').then((module) => ({ default: module.Favorites })));
const Generator = lazy(() => import('./pages/Generator.tsx').then((module) => ({ default: module.Generator })));
const CartPage = lazy(() => import('./pages/CartPage.tsx').then((module) => ({ default: module.CartPage })));
const CollectionDetail = lazy(() => import('./pages/CollectionDetail.tsx').then((module) => ({ default: module.CollectionDetail })));
const SavedDesigns = lazy(() => import('./pages/SavedDesigns.tsx').then((module) => ({ default: module.SavedDesigns })));
const AdminApp = lazy(() => import('./pages/admin/AdminApp.tsx').then((module) => ({ default: module.AdminApp })));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function RouteFallback() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 99) return 99;
        const increment = Math.max(1, Math.floor((99 - prev) * 0.15));
        return prev + increment;
      });
    }, 50);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-7xl flex-col items-center justify-center px-6 py-12 gap-8">
      <div className="relative flex items-center justify-center w-16 h-16">
        <div className="absolute inset-0 rounded-full border-t-2 border-neon-blue animate-spin" />
        <div className="absolute inset-2 rounded-full border-b-2 border-neon-purple animate-spin [animation-direction:reverse]" />
        <Sparkles size={20} className="text-neon-pink animate-pulse" />
      </div>
      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        <div className="flex items-center justify-between w-full">
          <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-gray-400 animate-pulse">
            Loading Artverse Module
          </div>
          <div className="text-[10px] font-mono font-bold tracking-widest text-neon-blue">
            {progress}%
          </div>
        </div>
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden relative">
          <div 
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-neon-blue via-neon-purple to-neon-pink rounded-full shadow-[0_0_10px_rgba(188,19,254,0.5)] transition-all duration-100 ease-out" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ProtectedDreamAccess({ component: Component }: { component: ComponentType }) {
  const { user, loading, signIn } = useAuth();

  if (loading) {
    return <RouteFallback />;
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center gap-6 px-6 py-12">
        {/* /customize* renders this gate outside the global Layout (see LayoutRoute in
            PageRoutes) — without this, a logged-out visitor landing here has no way back. */}
        <Link
          to="/"
          className="self-start text-[10px] font-bold uppercase tracking-widest text-gray-500 transition-colors hover:text-white"
        >
          ← Back to Artverse
        </Link>
        <div className="glass-card w-full max-w-2xl border-white/10 p-8 text-center sm:p-12">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-neon-purple/30 bg-neon-purple/15 text-neon-purple">
            <Sparkles size={28} />
          </div>
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-neon-blue/20 bg-neon-blue/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-neon-blue">
            <ShieldCheck size={12} />
            Member Access
          </span>
          <h1 className="text-3xl font-display font-black uppercase tracking-widest text-white sm:text-4xl">
            Dream Machine Is For Logged-In Users
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm uppercase tracking-wider leading-relaxed text-gray-400">
            Sign in to generate AI visuals, access backend mockup rendering, and continue into the private customization workflow.
          </p>
          <button
            type="button"
            onClick={() => void signIn()}
            className="mt-8 inline-flex items-center justify-center gap-3 rounded-2xl bg-white px-8 py-4 text-xs font-black uppercase tracking-[0.32em] text-cyber-black transition-all hover:bg-neon-purple hover:text-white"
          >
            <LogIn size={16} />
            Login With Google
          </button>
        </div>
      </div>
    );
  }

  return <Component />;
}

// Gates the custom admin management panel to Django `is_superuser` accounts only — deliberately
// stricter than ProtectedDreamAccess above (which only requires being logged in) and stricter
// than the customization editor's is_staff-gated dev-tools panel. A signed-in-but-not-superuser
// visitor gets a distinct "not authorized" message, not the sign-in prompt above.
function ProtectedAdminAccess({ component: Component }: { component: ComponentType }) {
  const { user, loading, isSuperuser, signIn } = useAuth();

  if (loading) {
    return <RouteFallback />;
  }

  if (!user || !isSuperuser) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-4xl flex-col items-center justify-center gap-6 px-6 py-12">
        <Link
          to="/"
          className="self-start text-[10px] font-bold uppercase tracking-widest text-gray-500 transition-colors hover:text-white"
        >
          ← Back to Artverse
        </Link>
        <div className="glass-card w-full max-w-2xl border-white/10 p-8 text-center sm:p-12">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-neon-pink/30 bg-neon-pink/15 text-neon-pink">
            <Lock size={28} />
          </div>
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-neon-pink/20 bg-neon-pink/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-neon-pink">
            <ShieldCheck size={12} />
            Restricted Area
          </span>
          <h1 className="text-3xl font-display font-black uppercase tracking-widest text-white sm:text-4xl">
            {user ? 'Not Authorized' : 'Admin Sign-In Required'}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm uppercase tracking-wider leading-relaxed text-gray-400">
            {user
              ? "This account doesn't have superuser access to the Artverse admin panel."
              : 'Sign in with a superuser account to manage catalog, pricing, and site content.'}
          </p>
          {!user && (
            <button
              type="button"
              onClick={() => void signIn()}
              className="mt-8 inline-flex items-center justify-center gap-3 rounded-2xl bg-white px-8 py-4 text-xs font-black uppercase tracking-[0.32em] text-cyber-black transition-all hover:bg-neon-purple hover:text-white"
            >
              <LogIn size={16} />
              Login With Google
            </button>
          )}
        </div>
      </div>
    );
  }

  return <Component />;
}

// The customization editor is a full-screen, distraction-free workspace (like Printify's own
// product editor) — it deliberately renders outside the global Navbar/Footer chrome that every
// other route gets via LayoutRoute below.
function LayoutRoute() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function PageRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<LayoutRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/generator" element={<ProtectedDreamAccess component={Generator} />} />
          <Route path="/saved-designs" element={<ProtectedDreamAccess component={SavedDesigns} />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/collections/:collectionId" element={<CollectionDetail />} />
        </Route>
        <Route path="/customize" element={<ProtectedDreamAccess component={Customization} />} />
        <Route path="/customize/product/:productSlug" element={<ProtectedDreamAccess component={Customization} />} />
        <Route path="/admin/*" element={<ProtectedAdminAccess component={AdminApp} />} />
      </Routes>
    </Suspense>
  );
}

function AppRouter() {
  return (
    <Router>
      <ScrollToTop />
      <PageRoutes />
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppRouter />
      </CartProvider>
    </AuthProvider>
  );
}
