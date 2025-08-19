# Portable Content Specification (PCS) — Core Spec (v0.1 Draft)

Editor story is v2; this spec covers delivery.

## 1. Concepts and Vocabulary
- ContentItem: Portable Content Manifest (PCM) describing a piece of content to render.
- Block: Typed unit (markdown, image, video, mermaid, code, document, repo, embed, …).
- Variant: A output representation of a block (media type + parameters), e.g., image/svg+xml;profile=mermaid.
- Capabilities: Client preferences/hints used for variant selection.
- Registry: Authoritative catalog of kinds, schemas, transforms, and policies.

## 2. Data Model (JSON)
- ContentItem (PCM)
  - id (string, URI-safe)
  - type (string)
  - title (string, optional)
  - summary (string, optional)
  - blocks (array of Block)
  - representations (object; named views with block id lists)
  - meta: createdAt, updatedAt, createdBy (optional, RFC3339 strings)
- Block
  - id (string)
  - kind (string; namespaced allowed: vendor:kind)
  - payload (object|string|null)
  - variants (array of Variant)
- Variant
  - mediaType (string; RFC 6838, with optional parameters per RFC 6906)
  - uri (string, optional)
  - width, height, bytes (integers, optional)
  - contentHash (string, optional)
  - generatedBy, toolVersion (strings, optional)
  - createdAt (RFC3339 string, optional)

Normative JSON Schemas are in ./schemas/.

## 3. Capability Negotiation
- Input structure (CapabilitiesInput):
  - accept: list of media types (may contain parameters)
  - hints: width, density, network (optional)
- Selection rules:
  - Prefer exact match on media type + parameters
  - If multiple matches, pick highest quality/density fitting hints
  - Provide at least one safe fallback (server MUST ensure)
- GraphQL is the normative API shape for delivery (see ./graphql/schema.graphql).

## 4. Registry
- Core registry defines base kinds, payload schemas, allowed variants, transforms, policies.
- Extensions: third parties publish namespaced kinds (vendor:kind) in separate packages.
- Composition:
  - A compose file merges core + extensions; supports enable/disable/overrides.
  - Deterministic precedence (later overrides earlier unless explicit overrides provided).
- Packaging & pinning:
  - Distribute as npm package + GitHub Release tarball; consumers pin versions.
  - Optional Packagist/PyPI wrappers.
- Conventions:
  - Media type parameters: profile=, role=, dpi=, page=, width=
  - Sanitization profiles: e.g., html:markdown-safe

## 5. Transforms
- Contract (language-agnostic):
  - Inputs: src URI(s), op, options, outMediaType
  - Outputs (JSON): mediaType, uri, width/height/bytes, contentHash, generatedBy, toolVersion, createdAt
  - Idempotent via content-addressed naming (src+options → same key)
- Orchestration (production reference):
  - Python worker orchestrates containerized tools per job
  - Tool images versioned and pinned; provenance recorded in Variant
- Runners:
  - NativeRunner (dev), ContainerRunner (prod), JobRunner (K8s/serverless; optional)

## 6. Security
- Server-side sanitization for HTML (markdown-safe allowlist)
- URL allowlists for embeds/documents; block unsafe protocols
- Size/time limits on transforms; strip EXIF by default

## 7. Versioning & Compatibility
- Spec has a semver version (this doc v0.1); registry has its own version.
- Manifests SHOULD include contentSpecVersion and registryVersion.
- Minor/patch: additive; Major: breaking (removals, incompatible schema changes).

## 8. Compliance
- A compliant implementation MUST:
  - Validate manifests against the JSON Schemas
  - Implement capability-based variant selection
  - Respect sanitization policies for HTML output
  - Record transform provenance into Variant
- Test suite will include fixtures and golden output checks.

## 9. Non-goals (v1)
- Editor/interchange protocols
- Per-block ACLs beyond domain-level policy
- Arbitrary plugin execution in clients


## 10. Open Questions (to revisit)
- Transform options schemas: define per-transform JSON Schemas (e.g., image-resize.schema.json) and ship them in the registry?
- HTML sanitization policy detail: explicitly disallow data: URIs in img[src] (except small SVG?) vs allow with size limits; host allowlist examples?
- SDL Optional types: keep Note as a non-normative example in the core SDL, or move to an "implementations" SDL section?

