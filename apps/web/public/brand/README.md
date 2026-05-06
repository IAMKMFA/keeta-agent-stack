# Brand assets — `apps/web/public/brand`

This folder holds static brand artefacts the site links to directly. None of the assets here are
imported through `next/image`; they are referenced as plain URLs from `<meta>` tags or markdown
links.

| File             | Purpose                                                                     |
| ---------------- | --------------------------------------------------------------------------- |
| `og-default.svg` | Default Open Graph / Twitter card image, served at `/brand/og-default.svg`. |

When adding a new asset:

- Prefer SVG for vector marks; export raster fallbacks only when an external consumer (Slack
  unfurls, Twitter cards) needs PNG.
- Never copy logos, illustrations, gradients, or icons from third-party sites.
- Anything that includes the Keeta wordmark must use our own approved rendering of our own mark.
