# Compliance (PCS v0.1 Draft)

A compliant implementation MUST:
- Validate PCM manifests against JSON Schemas
- Implement capability-driven variant selection (media types + parameters)
- Enforce sanitization policies for HTML/markdown outputs
- Record provenance into VariantDescriptor after transforms

Tests & fixtures:
- Provide example manifests per kind (markdown, image, mermaid, document, code)
- Golden tests for transforms (mermaid → SVG/PNG; pdf → thumbnail)
- Registry composition tests (enable/disable/override precedence)

