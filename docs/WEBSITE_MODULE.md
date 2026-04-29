# Website Module

## Purpose

The Website module is the public-facing business website. It is designed to remain visually polished while being portable for another company or Managing Agent.

## File Map

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Public homepage route. Reads database-backed website settings and renders the website. |
| `modules/website/website.config.ts` | Portable website content/config registry for reusable sections, cards, links and default visual copy. |
| `components/PublicServiceSelector.tsx` | Interactive public service selector section. |
| `app/api/website/assets/route.ts` | Admin-only website image/logo upload route. |
| `website_settings` table | Database-backed website title, copy, logo, colors, typography and contact settings. |
| `public/` | Static public assets, uploaded logos and images. |

## Customization

The Website module is primarily customized through `website_settings` and the Website Admin panel:

- company/site title
- tagline
- hero heading and body copy
- logo path, width and radius
- brand colors
- typography sizes and font family
- contact email, phone and address
- footer note
- platform sidebar labels

Reusable section defaults such as services, proof cards, trust signals and the ERP sign-in link are kept in `modules/website/website.config.ts`.

## Portability

To reuse the website for another company:

1. Create or select the target Managing Agent.
2. Configure `website_settings` through the Website Admin panel.
3. Upload the new logo/favicons through the website asset upload route.
4. Update `modules/website/website.config.ts` only when the structure of public sections needs to change.
5. Keep the sign-in link pointing to the mounted ERP path, normally `/realtyos/admin/login`.

## Isolation Boundary

The public Website module reads website settings and public assets. It does not directly expose PMS, CRM, Finance, tenant, reporting or document data. Backend modules remain under `/app` and `/api/*` routes protected by authentication.

## SEO and Metadata

Current website copy and visible page content are database-backed. If richer SEO templates are needed, add fields to `website_settings` and consume them in `app/page.tsx` metadata.

## Remaining Coupling

The homepage currently uses shared styling utilities and shared icons from the platform. This is intentional to keep one brand system. The module is portable by configuration, but it is not a standalone package independent of the Next.js application.
