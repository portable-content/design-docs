# Security (PCS v0.1 Draft)

## HTML/Markdown
- Server-side sanitization (rehype-sanitize or equivalent) with a tight allowlist
- Allowed elements: p, h1–h6, ul/ol/li, a, code, pre, blockquote, em/strong, hr, table/thead/tbody/tr/th/td, img (optional)
- Attributes: a[href] (https/http/mailto; add rel="noopener noreferrer"), img[src|alt|width|height] (CDN only)
- Strip inline events, scripts, iframes, dangerous styles
- Open question: Should data: URIs be forbidden for img[src] (except potentially tiny SVGs), or allowed with strict size limits? Should we document a host allowlist example?


## Embeds/Documents
- URL allowlists, MIME sniffing, size limits
- PDF/Office via containerized tools; sanitize outputs

## Transforms
- Non-root containers; resource limits; timeouts
- Strip EXIF; block dangerous formats; validate input headers

## Registry policies
- Security profiles versioned in registry; clients must enforce policies before rendering

