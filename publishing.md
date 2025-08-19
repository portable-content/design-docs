# Publishing (PCS/PCM)

## Repos
- portable-content/spec — the spec and registry skeleton
- portable-content/registry — (optional) separate repo for registry packages
- portable-content/sdk-ts, sdk-php, sdk-py — reference SDKs
- portable-content/site — docs site for portablecontent.dev

## Packages & Images
- npm: @portable-content/registry
- Composer: portable-content/registry (optional wrapper)
- PyPI: portable-content-registry (optional wrapper)
- Containers: ghcr.io/portable-content/* (tool images)

## Release process
1) Tag spec repo (v0.1.0):
   - Validate JSON Schemas and SDL
   - Lint registry skeleton
   - Build a release tarball with graphql/, schemas/, registry/
2) Publish @portable-content/registry to npm
   - Include registry.json, kinds/, variants/, policies/
   - Include integrity hash and registryVersion
3) GitHub Release
   - Attach tarball for universal consumption
4) (Optional) Publish wrappers for PHP/Python
5) Update portablecontent.dev with release notes and docs

## Versioning
- SemVer across spec and registry packages
- Pin registry versions in consumers; record registryVersion and contentSpecVersion in manifests


