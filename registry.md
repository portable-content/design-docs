# Registry, Extensions, and Composition (PCS v0.1 Draft)

## Purpose
Provide a source of truth for kinds, payload schemas, allowed variants, transforms, security policies, and defaults. Enable third‑party extensions and project‑level composition so adopters can include/exclude what they need.

## Structure
- registry.json (index: version, specVersion, packages)
- kinds/*.schema.json (payload schemas)
- variants/*.json (media type profiles/roles per kind)
- transforms/*.json (tool images, ops, options, outputs)
- policies/sanitization/*.json (e.g., html:markdown-safe)

## Packaging
- Core: publish as an npm package (e.g., @portable-content/registry) and attach a tarball to GitHub Releases.
- Extensions: third parties publish their own packages (namespaced kinds like vendor:3d-model).
- Pinning: consumers depend on explicit versions (e.g., @portable-content/registry@0.3.1).

## Composition
- Compose file (JSON):
```json
{
  "base": "@portable-content/registry@^0.3",
  "extensions": ["@acme/content-registry-3d@^1", "./local-registry"],
  "enable": ["markdown", "mermaid", "document", "acme:3d-model"],
  "disable": ["embed"],
  "overrides": {
    "markdown.sanitization": "./policies/markdown-strict.json"
  }
}
```

- Precedence: later packages override earlier; explicit overrides win.
- Output: a composed registry.json used by servers, workers, SDKs.

## Validation
- Composition step validates:
  - JSON Schemas merge cleanly; kinds have unique ids
  - Media types/parameters are recognized
  - Transform images exist and versions are pinned

## Consumption
- TS: import package(s) and compose at build/start; cache composed registry
- PHP/Python: load tarball/JSON and compose; cache result

## Security
- Deny unknown kinds by default; only enabled kinds are allowed
- Allowlist extension package sources
- Record registryVersion in manifests processed under it

## Versioning
- Separate semver for: spec, core registry, and each extension
- Follow additive-only on minor/patch; major for breaking changes


## Open Questions (to revisit)
- Should per-transform options JSON Schemas (e.g., transforms/image-resize.schema.json) be included in the registry package by default?

