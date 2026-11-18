# CRS Calculator

Free Express Entry CRS calculator and guides, built as a static site and deployed on Cloudflare Workers with static assets.

## Deploy

Pushes to `main` deploy automatically through Cloudflare Workers Builds. The Worker name is `crscalculator`.

## Structure

- `index.html`: CRS calculator tool and homepage content
- `crs-engine.js`: scoring engine (IRCC November 3, 2026 grid)
- `noc-data.js`: 186 high-wage NOC codes
- `clb-calculator.html`, `noc-lookup.html`: tools
- Five guide pages, five required pages (About, Contact, Privacy, Terms, Disclaimer)
- Six supporting guides: PNP 600 points, category-based draws, CEC, FST, ECA, proof of funds
- `_redirects`: clean URL redirects
- `sitemap.xml`, `robots.txt`, `og-image.png`

All scoring facts are verified against official IRCC pages on canada.ca.
