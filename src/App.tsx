/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Layout } from './components/Common.tsx';
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
          <Route path="/generator" element={<Generator />} />
          <Route path="/customize" element={<Customization />} />
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
