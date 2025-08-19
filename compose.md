# Registry Composition (PCS)

## Compose file
A simple JSON file describing how to assemble a composed registry from the core registry and extensions.

Example (registry.compose.example.json):
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

## Loader/CLI semantics
- Merge order: base first, then extensions in listed order; overrides applied last
- Validation: unique kind ids; schemas present; media types parse; transform images resolvable
- Output: a single composed registry.json
- Exit codes: 0 on success; non-zero on validation or I/O errors

## Security
- Allowlist extension sources; deny unknown kinds unless explicitly enabled
- Record the registryVersion used to compose

