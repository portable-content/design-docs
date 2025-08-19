# Versioning (PCS v0.1 Draft)

## Spec version
- This spec uses semantic versioning
- contentSpecVersion should be recorded in manifests processed/produced by SDKs

## Registry version
- Each registry package declares its own version (SemVer)
- Manifests SHOULD include registryVersion used at creation/last validation time

## Compatibility policy
- Minor/patch releases are additive and should be backward compatible
- Major releases can remove kinds/variants or change schemas incompatibly
- SDKs should warn/deny loading manifests with incompatible spec/registry versions (configurable)

