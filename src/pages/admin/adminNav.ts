/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Single source of truth for the admin panel's sidebar structure — consumed by both
// AdminLayout.tsx (renders the nav) and AdminApp.tsx (generates the matching <Route> list),
// so the two can never drift apart.

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  BookOpen,
  Boxes,
  Ticket,
  FolderTree,
  Globe,
  Heart,
  Image as ImageIcon,
  Images,
  LayoutDashboard,
  Layers,
  Package,
  Percent,
  Ruler,
  ScrollText,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Tags,
  UserCog,
  Users,
  Video,
  Wand2,
} from "lucide-react";

export interface AdminNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  /** Dashboard only — its path ("") is a prefix of every other admin route, so its NavLink
   * needs exact (`end`) matching or it would render "active" on every page. */
  end?: boolean;
}

export interface AdminNavSection {
  heading: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavSection[] = [
  {
    heading: "Overview",
    items: [{ path: "", label: "Dashboard", icon: LayoutDashboard, end: true }],
  },
  {
    heading: "Catalog",
    items: [
      { path: "catalog/categories", label: "Product Categories", icon: FolderTree },
      { path: "catalog/products", label: "Products", icon: ShoppingBag },
      { path: "catalog/mockup-templates", label: "Mockup Templates", icon: Layers },
      { path: "catalog/product-variants", label: "Product Variants", icon: Boxes },
    ],
  },
  {
    heading: "Gallery",
    items: [
      { path: "gallery/categories", label: "Categories", icon: Tags },
      { path: "gallery/collections", label: "Collections", icon: Images },
      { path: "gallery/artworks", label: "Artworks", icon: ImageIcon },
      { path: "gallery/videos", label: "Video Clips", icon: Video },
    ],
  },
  {
    heading: "Pricing",
    items: [
      { path: "pricing/configuration", label: "Pricing Configuration", icon: Settings },
      { path: "pricing/print-area-charges", label: "Print Area Charges", icon: Ruler },
      { path: "pricing/rules", label: "Pricing Rules", icon: Percent },
      { path: "pricing/coupons", label: "Coupons", icon: Ticket },
    ],
  },
  {
    heading: "Users & Access",
    items: [{ path: "users", label: "Users", icon: UserCog }],
  },
  {
    heading: "Site",
    items: [{ path: "site/configuration", label: "Site Configuration", icon: Globe }],
  },
  {
    heading: "Printify",
    items: [
      { path: "printify/blueprints", label: "Blueprints", icon: Package },
      { path: "printify/sync-runs", label: "Sync Runs", icon: ScrollText },
    ],
  },
  {
    heading: "Support & Monitoring",
    items: [
      { path: "support/design-projects", label: "Design Projects", icon: Wand2 },
      { path: "support/mockup-renders", label: "Mockup Renders", icon: ImageIcon },
      { path: "support/print-files", label: "Generated Print Files", icon: ScrollText },
      { path: "support/generation-requests", label: "Generation Requests", icon: Activity },
      { path: "support/generated-images", label: "Generated Images", icon: ImageIcon },
      { path: "support/source-assets", label: "Source Design Assets", icon: Layers },
      { path: "support/notifications", label: "Notification Subscriptions", icon: Bell },
      { path: "support/favorites", label: "Favorites", icon: Heart },
      { path: "support/carts", label: "Carts", icon: ShoppingCart },
      { path: "support/admin-guide", label: "Admin Guide", icon: BookOpen },
    ],
  },
];

// "" — the Dashboard route. /admin/* itself now renders the Dashboard directly (an <Route index>
// in AdminApp.tsx, not a redirect into Categories or any other resource) — see ADMIN_NAV's
// "Overview" section above.
export const ADMIN_HOME_PATH = ADMIN_NAV[0].items[0].path;

// Printify print providers are only ever shown nested under a blueprint's detail (no standalone
// list endpoint) — see the plan's "Print Providers (read-only, nested)" note — so it deliberately
// has no top-level nav entry / route of its own, unlike everything above.
