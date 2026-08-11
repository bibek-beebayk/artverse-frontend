/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "../../components/admin/AdminLayout.tsx";
import { AdminDialogProvider } from "../../components/admin/AdminDialogProvider.tsx";
import { ToastProvider } from "../../components/admin/ToastProvider.tsx";
import { ADMIN_HOME_PATH } from "./adminNav.ts";
import { DashboardPage } from "./resources/DashboardPage.tsx";
import { ProductCategoriesPage } from "./resources/ProductCategoriesPage.tsx";
import { ProductsPage } from "./resources/ProductsPage.tsx";
import { MockupTemplatesPage } from "./resources/MockupTemplatesPage.tsx";
import { ProductVariantsPage } from "./resources/ProductVariantsPage.tsx";
import { GalleryCategoriesPage } from "./resources/GalleryCategoriesPage.tsx";
import { CollectionsPage } from "./resources/CollectionsPage.tsx";
import { ArtworksPage } from "./resources/ArtworksPage.tsx";
import { VideoClipsPage } from "./resources/VideoClipsPage.tsx";
import { PricingConfigurationPage } from "./resources/PricingConfigurationPage.tsx";
import { PrintAreaChargesPage } from "./resources/PrintAreaChargesPage.tsx";
import { PricingRulesPage } from "./resources/PricingRulesPage.tsx";
import { CouponsPage } from "./resources/CouponsPage.tsx";
import { UsersPage } from "./resources/UsersPage.tsx";
import { SiteConfigurationPage } from "./resources/SiteConfigurationPage.tsx";
import { PrintifyBlueprintsPage } from "./resources/PrintifyBlueprintsPage.tsx";
import { PrintifySyncRunsPage } from "./resources/PrintifySyncRunsPage.tsx";
import { DesignProjectsPage } from "./resources/DesignProjectsPage.tsx";
import { MockupRendersPage } from "./resources/MockupRendersPage.tsx";
import { GeneratedPrintFilesPage } from "./resources/GeneratedPrintFilesPage.tsx";
import { GenerationRequestsPage } from "./resources/GenerationRequestsPage.tsx";
import { GeneratedImagesPage } from "./resources/GeneratedImagesPage.tsx";
import { SourceDesignAssetsPage } from "./resources/SourceDesignAssetsPage.tsx";
import { NotificationSubscriptionsPage } from "./resources/NotificationSubscriptionsPage.tsx";
import { FavoritesPage } from "./resources/FavoritesPage.tsx";
import { CartsPage } from "./resources/CartsPage.tsx";
import { AdminGuidePage } from "./resources/AdminGuidePage.tsx";

// Route paths here must match adminNav.ts's item.path values exactly — that file is the single
// source of truth for the sidebar, this file is the matching route table.
export function AdminApp() {
  return (
    <ToastProvider>
      <AdminDialogProvider>
        <AdminLayout>
          <Routes>
            <Route index element={<DashboardPage />} />

            <Route path="catalog/categories" element={<ProductCategoriesPage />} />
            <Route path="catalog/products" element={<ProductsPage />} />
            <Route path="catalog/mockup-templates" element={<MockupTemplatesPage />} />
            <Route path="catalog/product-variants" element={<ProductVariantsPage />} />

            <Route path="gallery/categories" element={<GalleryCategoriesPage />} />
            <Route path="gallery/collections" element={<CollectionsPage />} />
            <Route path="gallery/artworks" element={<ArtworksPage />} />
            <Route path="gallery/videos" element={<VideoClipsPage />} />

            <Route path="pricing/configuration" element={<PricingConfigurationPage />} />
            <Route path="pricing/print-area-charges" element={<PrintAreaChargesPage />} />
            <Route path="pricing/rules" element={<PricingRulesPage />} />
            <Route path="pricing/coupons" element={<CouponsPage />} />

            <Route path="users" element={<UsersPage />} />

            <Route path="site/configuration" element={<SiteConfigurationPage />} />

            <Route path="printify/blueprints" element={<PrintifyBlueprintsPage />} />
            <Route path="printify/sync-runs" element={<PrintifySyncRunsPage />} />

            <Route path="support/design-projects" element={<DesignProjectsPage />} />
            <Route path="support/mockup-renders" element={<MockupRendersPage />} />
            <Route path="support/print-files" element={<GeneratedPrintFilesPage />} />
            <Route path="support/generation-requests" element={<GenerationRequestsPage />} />
            <Route path="support/generated-images" element={<GeneratedImagesPage />} />
            <Route path="support/source-assets" element={<SourceDesignAssetsPage />} />
            <Route path="support/notifications" element={<NotificationSubscriptionsPage />} />
            <Route path="support/favorites" element={<FavoritesPage />} />
            <Route path="support/carts" element={<CartsPage />} />
            <Route path="support/admin-guide" element={<AdminGuidePage />} />

            <Route path="*" element={<Navigate to={ADMIN_HOME_PATH} replace />} />
          </Routes>
        </AdminLayout>
      </AdminDialogProvider>
    </ToastProvider>
  );
}
