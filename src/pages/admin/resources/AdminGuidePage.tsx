/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// This page is a condensed, React-admin-panel-focused version of docs/ADMIN_GUIDE.md — kept in
// sync by hand. Whenever docs/ADMIN_GUIDE.md changes in a way that affects how this panel is
// used (a new screen, a changed workflow, a renamed filter/action), update the matching section
// below in the same pass. It is not a live render of the markdown file — there is no backend
// endpoint serving docs, and the content here is deliberately written for "how do I do this in
// the panel I'm looking at right now," not the Django admin's own workflow.

import { type ReactNode } from "react";

interface GuideSection {
  id: string;
  title: string;
  body: ReactNode;
}

function Callout({ tone = "info", children }: { tone?: "info" | "warning"; children: ReactNode }) {
  return (
    <div
      className={
        tone === "warning"
          ? "rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-xs leading-relaxed text-yellow-200"
          : "rounded-xl border border-neon-blue/20 bg-neon-blue/5 px-4 py-3 text-xs leading-relaxed text-gray-300"
      }
    >
      {children}
    </div>
  );
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3 text-xs leading-relaxed text-gray-300">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[10px] font-black text-white">
            {index + 1}
          </span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-neon-blue">{children}</code>
  );
}

const SECTIONS: GuideSection[] = [
  {
    id: "access",
    title: "Access & who can see this",
    body: (
      <div className="flex flex-col gap-3 text-xs leading-relaxed text-gray-300">
        <p>
          This panel is gated to Django <Code>is_superuser</Code> accounts only — deliberately
          stricter than <Code>is_staff</Code>, which only gates the customization editor's own
          Production Print Files dev-tools panel. A staff-but-not-superuser account gets a clear
          "not authorized" screen, not this sidebar.
        </p>
        <p>
          To grant access: on <strong className="text-white">Users &amp; Access → Users</strong>,
          toggle <Code>is_superuser</Code> on the target account, or run{" "}
          <Code>python manage.py createsuperuser</Code> from a shell for a brand-new one. There is
          no self-service path — someone who already has the flag (or shell/database access) has
          to grant it.
        </p>
        <p>
          Everything here writes to the same database as the Django admin at{" "}
          <Code>/admin/</Code> — a change made in either place is immediately visible in the
          other. A few things (raw Printify audit fields, the full CSV bulk-import options, the
          visual <Code>safe_area</Code>/<Code>bleed_area</Code> editor's Django-admin equivalent)
          are Django-admin-only — see "What's Django-admin-only" at the end of this guide.
        </p>
      </div>
    ),
  },
  {
    id: "dashboard",
    title: "Dashboard",
    body: (
      <div className="flex flex-col gap-3 text-xs leading-relaxed text-gray-300">
        <p>
          The landing page — everything here reads real current data, never a placeholder or a
          sales/revenue figure (there's no order/checkout system yet to report on).
        </p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            <strong className="text-white">Products</strong> — Active, Inactive, and Needs
            Attention counts (an active product losing its only sellable variant is the usual
            cause of the last one).
          </li>
          <li>
            <strong className="text-white">Variants</strong> — Sellable, Missing Production Cost,
            Unavailable.
          </li>
          <li>
            <strong className="text-white">Printify &amp; Generator</strong> — Failed Sync Runs,
            Failed Mockup Renders, Failed AI Generations, total Generated Print Files.
          </li>
          <li>
            <strong className="text-white">Commerce &amp; Users</strong> — Current Carts (carts
            with at least one item), total registered Users.
          </li>
        </ul>
        <p>
          The Quick Actions below the cards jump straight into Add Product, Add Mockup Template,
          Upload Artworks, Sync Printify Catalogue, Review Product Issues (pre-filtered to Needs
          Attention), and Review Failed Renders.
        </p>
      </div>
    ),
  },
  {
    id: "products",
    title: "Catalog → Products",
    body: (
      <div className="flex flex-col gap-3 text-xs leading-relaxed text-gray-300">
        <p>
          The storefront listing customers actually browse — distinct from a Mockup Template
          (below), which controls rendering, not the listing itself. A product has no price or
          inventory of its own; both are entirely derived from its variants.
        </p>
        <p>
          Use the search box and the filter bar (Category, Active/Inactive, Readiness, Product
          Type, Mockup Template) plus the ordering dropdown (Name, Newest/Oldest, Starting Price,
          Variant Count) to find what you need — filters are reflected in the URL, so a filtered
          view is shareable/bookmarkable.
        </p>
        <p>
          Every row shows a <strong className="text-white">Ready / Needs Attention / Inactive
          Draft</strong> readiness badge — click it for the specific reason(s): no variants,
          missing production cost, no sellable variant, no mockup template, no Printify provider
          selected on the mapped template, and so on. This is the same check the Activate action
          runs, so a product never shows Ready and then fails to activate for a surprise reason.
        </p>
        <p>Opening a product (Edit) shows:</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            <strong className="text-white">Storefront Status</strong> — starting price, total /
            sellable / unavailable variant counts, missing-cost count, the readiness badge again.
          </li>
          <li>
            <strong className="text-white">Onboarding Checklist</strong> — Product created,
            Mockup template selected, Printify blueprint mapped, Print provider selected, Variants
            synced, Production costs reviewed, Product activated. Every tick is derived from real
            data — nothing here is a flag you set by hand.
          </li>
          <li>
            <strong className="text-white">Quick Links</strong> — View Variants, Sync Printify
            Variants, Open Mockup Template, and (once active with a sellable variant) View in
            Shop.
          </li>
        </ul>
        <p>
          A new product starts as a draft (inactive) and stays hidden from the public site. Use
          the row's Activate action once its readiness badge reads Ready — it runs the same
          validation as the checklist, so if it rejects, the readiness badge already told you why.
          Deactivate always succeeds, no validation needed. Sync (the refresh icon) pulls
          colour/size availability from the mapped Printify provider into this product's
          variants.
        </p>
      </div>
    ),
  },
  {
    id: "mockup-templates",
    title: "Catalog → Mockup Templates",
    body: (
      <div className="flex flex-col gap-3 text-xs leading-relaxed text-gray-300">
        <p>
          A template is one customizable product design (e.g. "Starter T-Shirt Black"). It has no
          image or placement fields of its own — every renderable surface is a{" "}
          <strong className="text-white">Part</strong> (Front / Back / Left Sleeve / Right
          Sleeve). A template can't be made Active until it has at least one part.
        </p>
        <p>Clicking into a template opens three tabs:</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            <strong className="text-white">Details</strong> — name, slug, product type,
            description, Active toggle, supported colours/sizes/file formats.
          </li>
          <li>
            <strong className="text-white">Parts</strong> — the configured print areas. Each part
            has its own image layers (base image required, mask/displacement/shadow/highlight
            optional) and a <strong className="text-white">unified visual editor</strong> drawn on
            the part's own photo: drag the blue box to move/resize the print area, the green box
            nested inside it is the safe area (drag its own corner handle, or use the numeric %
            fields), and the amber outline is the bleed (drag its 4 independent edge handles, or
            use the numeric px fields). This is exactly what a customer sees as guide lines while
            positioning their design.
          </li>
          <li>
            <strong className="text-white">Printify Mapping</strong> — shows the blueprint mapped
            to this template (mapped from the Printify → Blueprints screen, not here), the
            currently selected print provider, its variant count, its supported placeholders, and
            its last sync time, plus a per-part ✓/✕ compatibility table against the provider's
            placeholders. The provider dropdown only ever offers providers belonging to the
            mapped blueprint — see the Printify section below for the full setup order.
          </li>
        </ul>
        <Callout tone="warning">
          If you remap this template to a different blueprint while it still has a selected
          provider from the old one, the remap is rejected until you clear or change the provider
          first — this is deliberate, so a template can never end up pointing at a provider it can
          no longer reach.
        </Callout>
      </div>
    ),
  },
  {
    id: "product-variants",
    title: "Catalog → Product Variants",
    body: (
      <div className="flex flex-col gap-3 text-xs leading-relaxed text-gray-300">
        <p>
          One row per product × colour × size. Filter by Product, Print Provider, Colour, Size,
          Available, Sellable, Missing Production Cost, or External Provider, plus search
          (SKU, product name, external variant ID, colour, size) and ordering.
        </p>
        <p>
          Each row shows a{" "}
          <strong className="text-white">SELLABLE / MISSING COST / UNAVAILABLE / INVALID
          MAPPING</strong> badge — never inferred from Available alone. "Invalid Mapping" means
          either the variant's template no longer matches its product's mockup template, or it
          claims an external provider without an external ID.
        </p>
        <p>
          Check one or more rows to reveal a bulk-actions bar with exactly three safe actions:{" "}
          <strong className="text-white">Mark Available</strong>,{" "}
          <strong className="text-white">Mark Unavailable</strong>, and{" "}
          <strong className="text-white">Set Base Cost</strong> (applies the entered amount to
          every checked row). Deliberately nothing else is offered in bulk — no mass-editing
          external IDs, product/provider/template relationships, and no bulk delete; those need a
          dedicated per-row edit.
        </p>
        <p>
          <Code>base_cost</Code> is what the cart actually charges (base cost + markup) —{" "}
          <Code>retail_price</Code> is reference/display only and never used for pricing.
        </p>
      </div>
    ),
  },
  {
    id: "gallery",
    title: "Gallery",
    body: (
      <div className="flex flex-col gap-3 text-xs leading-relaxed text-gray-300">
        <p>
          Categories and Collections are simple name+slug groupings — create these before adding
          artworks that reference them. Artworks is the main AI-art catalogue shown on the public
          Gallery/Shop; a thumbnail is generated automatically on upload.
        </p>
        <p>
          Use the <strong className="text-white">Bulk Upload</strong> button on Artworks to import
          many at once via a CSV manifest (required columns <Code>title</Code>,{" "}
          <Code>category</Code>), optionally paired with a ZIP of image files. Tick{" "}
          <Code>dry_run</Code> first to validate without writing anything, then re-run for real.
        </p>
        <p>Video Clips populate the Gallery page's "Videos" tab — title, slug, thumbnail/video URL, published flag.</p>
      </div>
    ),
  },
  {
    id: "pricing",
    title: "Pricing",
    body: (
      <div className="flex flex-col gap-3 text-xs leading-relaxed text-gray-300">
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            <strong className="text-white">Pricing Configuration</strong> (singleton) — currency,
            flat tax percentage, flat shipping amount, free-shipping threshold. Carts are
            re-priced on every read, so a change here applies immediately.
          </li>
          <li>
            <strong className="text-white">Print Area Charges</strong> — extra cost per print
            area (front/back/sleeves) on top of a variant's base cost. A part with no row costs
            nothing extra.
          </li>
          <li>
            <strong className="text-white">Pricing Rules</strong> — markup by scope (Global /
            Category / Product-specific) and type (Fixed / Percentage). Only the single most
            specific matching rule applies — rules are never stacked. Give every product at least
            one applicable rule with a non-zero markup, or its price is exactly its raw base cost.
          </li>
          <li>
            <strong className="text-white">Coupons</strong> — code, discount type, optional
            min-subtotal / redemption caps / active window. <Code>times_redeemed</Code> doesn't
            increment yet — there's no order-completion step to redeem against.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "users",
    title: "Users & Access / Site",
    body: (
      <div className="flex flex-col gap-3 text-xs leading-relaxed text-gray-300">
        <p>
          Users lets a superuser toggle <Code>is_staff</Code>/<Code>is_superuser</Code>/
          <Code>is_artist</Code>/<Code>is_active</Code> on any account. Identity fields
          (username/email/password) are intentionally not editable here — this is a
          permissions-flag editor, not a full account editor.
        </p>
        <p>
          Site → Site Configuration (singleton) controls maintenance mode: a checkbox, an access
          key visitors can enter to get through anyway, and the message shown on the maintenance
          page.
        </p>
      </div>
    ),
  },
  {
    id: "printify",
    title: "Printify — full setup workflow",
    body: (
      <div className="flex flex-col gap-3 text-xs leading-relaxed text-gray-300">
        <p>
          Catalogue-only integration — no order submission yet. The API token lives only in the
          backend's <Code>.env</Code>, never sent to or shown in this panel. The{" "}
          <strong className="text-white">Connection Status</strong> card at the top of Blueprints
          shows Connected / Connection Error / Not Configured, the shop name/ID, and sync
          availability — it checks once on page load and again only when you click{" "}
          <strong className="text-white">Check Connection</strong>, never continuously.
        </p>
        <Steps
          items={[
            <>
              First-time only: an admin/developer adds <Code>PRINTIFY_API_TOKEN</Code>,{" "}
              <Code>PRINTIFY_SHOP_ID</Code>, and <Code>PRINTIFY_ENABLED=true</Code> to the
              backend's <Code>.env</Code> and restarts the server, then confirms with{" "}
              <Code>python manage.py printify_test_connection</Code> from a shell.
            </>,
            <>
              On Blueprints, use <strong className="text-white">Sync Blueprints</strong> once to
              bootstrap the list (it's empty until this runs).
            </>,
            <>
              Find the blueprint you want and expand it (the chevron) to inspect its providers —
              or trigger the per-row sync-providers action first if none are listed yet. Each
              provider shows variant count, available-variant count, missing-cost count, and
              supported print areas, all from already-synced local data.
            </>,
            <>
              Use the row's <strong className="text-white">Map</strong> action to set this
              blueprint's Mockup Template. A blueprint can only be mapped to one template at a
              time; mapping a different blueprint to a template that already has one automatically
              un-maps the old one.
            </>,
            <>
              Use <strong className="text-white">Select Provider</strong> — either from the
              expanded blueprint panel or the template's own Printify Mapping tab — to choose
              which of that blueprint's providers fulfils this template. Only providers belonging
              to the mapped blueprint are ever offered.
            </>,
            <>
              Optionally, on the template's Parts, set each part's Printify Placeholder Position
              to the exact key the provider uses for that print area (usually the same as the
              part name). A non-blank value is rejected unless a provider is selected and synced
              and actually offers that position.
            </>,
            <>
              On the product using that template, run{" "}
              <strong className="text-white">Sync Printify Variants</strong> (Products page row
              action, or the Quick Link on the product's detail view). This creates/updates
              variant rows matched by colour+size and marks anything the provider no longer lists
              as unavailable — it never deletes a row. Pricing is left for you to review and set;
              the sync never guesses a cost.
            </>,
          ]}
        />
        <p>
          Printify → Sync Runs is a read-only audit log (kind, status, counts, error message, who
          triggered it, timestamps) — check it if a sync seems to have done nothing.
        </p>
      </div>
    ),
  },
  {
    id: "support",
    title: "Support & Monitoring",
    body: (
      <div className="flex flex-col gap-3 text-xs leading-relaxed text-gray-300">
        <p>
          Read-only visibility into any user's data for support purposes, without needing
          shell/database access — Design Projects, Mockup Renders, Generated Print Files,
          Generation Requests, Generated Images, Source Design Assets, Favorites, Carts. Only
          Notification Subscriptions also supports delete.
        </p>
        <p>This is also where this Admin Guide page itself lives in the sidebar.</p>
        <p>
          Useful for investigating a "my preview looks wrong" report: find the render by artwork
          title or the customer's design project, and check its status/error message.
        </p>
      </div>
    ),
  },
  {
    id: "workflow",
    title: "Common workflow: launch a brand-new customizable product",
    body: (
      <Steps
        items={[
          <>Catalog → Mockup Templates → New. Fill name/slug/product type/description.</>,
          <>
            Open it, go to Parts, add at least a <Code>front</Code> part with a real base photo,
            then use the visual editor to set the print area (and, if you want customer-visible
            guides, the safe area and bleed).
          </>,
          <>Add Back/sleeve parts too, if this product prints there — otherwise leave them out.</>,
          <>
            Catalog → Products → New (or edit an existing one) and set its Mockup Template to the
            template from step 1.
          </>,
          <>
            Add Product Variants for each colour/size you're selling, with real pricing (either
            from the Product Variants screen or inline while editing the product) — or map to
            Printify and use Sync Printify Variants, then fill in each variant's Base Cost.
          </>,
          <>
            Check the product's readiness badge on the Products list — once it reads Ready, use
            the row's Activate action.
          </>,
        ]}
      />
    ),
  },
  {
    id: "django-only",
    title: "What's still Django-admin-only",
    body: (
      <ul className="ml-4 list-disc space-y-1.5 text-xs leading-relaxed text-gray-300">
        <li>Raw Printify audit fields (the full raw API response stored on blueprints/providers).</li>
        <li>The full CSV-manifest bulk-import options beyond the common case this panel's Bulk Upload form covers.</li>
        <li>
          The customization editor's own Production Print Files dev-tools panel — that's gated by{" "}
          <Code>is_staff</Code>, unrelated to this superuser-only admin panel.
        </li>
      </ul>
    ),
  },
];

export function AdminGuidePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-xl font-black uppercase tracking-widest text-white">Admin Guide</h1>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-gray-400">
          A quick reference for using this panel — condensed from <Code>docs/ADMIN_GUIDE.md</Code>,
          which remains the fuller reference (including the Django admin at <Code>/admin/</Code> on
          the backend).
        </p>
      </div>

      <nav className="glass-card mb-6 border-white/10 p-4">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500">On this page</div>
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-300 hover:text-white"
            >
              {section.title}
            </a>
          ))}
        </div>
      </nav>

      <div className="flex flex-col gap-6">
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="glass-card scroll-mt-6 border-white/10 p-5">
            <h2 className="mb-4 text-sm font-display font-black uppercase tracking-widest text-white">
              {section.title}
            </h2>
            {section.body}
          </section>
        ))}
      </div>
    </div>
  );
}
