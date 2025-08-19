# Transform Contract and Orchestration (PCS v0.1 Draft)

## Contract (language-agnostic)
- Inputs
  - src: one or more URIs to canonical payloads (S3/GCS/HTTP)
  - op: operation (e.g., thumbnail|convert|render|extract)
  - options: JSON object (size, format, quality, density, page, theme, etc.)
  - outMediaType: target media type + parameters (e.g., image/png;role=thumbnail;width=512)
- Outputs (JSON)
  - mediaType, uri, width, height, bytes
  - contentHash, generatedBy, toolVersion, createdAt
- Behavior
  - Idempotent naming: same src+op+options → same output key
  - Safety: enforce size/time limits; sanitize inputs

## Execution Modes
- Native sidecar process (dev): Python spawns local binaries (node, php, imagemagick). Fast DX; less isolation.
- Pod sidecar service (long-lived helper): sibling container in the same pod exposing CLI/HTTP; low latency; moderate isolation.
- Orchestrated per-job container (recommended prod): worker launches an ephemeral tool container per transform; strong reproducibility/isolation.
- Container-only jobs (optional): worker submits K8s Jobs/serverless tasks; maximal isolation; more orchestration overhead.

Decision: Use orchestrated per-job containers in production; allow native sidecar for local dev. Record the image tag/sha used in VariantDescriptor.

