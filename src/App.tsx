/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy, useEffect, type ComponentType } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { LogIn, ShieldCheck, Sparkles } from 'lucide-react';
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

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function RouteFallback() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-7xl items-center justify-center px-6 py-12">
      <div className="glass-card border-white/10 px-6 py-4 text-xs font-bold uppercase tracking-[0.4em] text-gray-400">
        Loading Artverse
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
      <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center px-6 py-12">
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

function PageRoutes() {
  return (
    <Layout>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/generator" element={<ProtectedDreamAccess component={Generator} />} />
          <Route path="/customize" element={<ProtectedDreamAccess component={Customization} />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/collections/:collectionId" element={<CollectionDetail />} />
        </Routes>
      </Suspense>
    </Layout>
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
