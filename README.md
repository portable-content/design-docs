# Portable Content Specification (PCS) — v0.1 Draft

This directory contains a self-contained, extractable spec for the Portable Content Specification (PCS) and the Portable Content Manifest (PCM).

Editor story is explicitly out of scope for v1 (delivery-focused). A v2 editor/interchange may be defined later.

## Contents
- spec.md — Core Spec (data model, semantics, capability negotiation)
- registry.md — Registry packages, extensions, composition, and pinning
- transforms.md — Transform contract, orchestration, runners, provenance
- security.md — Sanitization profiles, allowlists, safety constraints
- versioning.md — SemVer policy and manifest compatibility
- compliance.md — Conformance requirements and tests
- graphql/schema.graphql — Spec-local GraphQL SDL
- schemas/*.json — Spec-local JSON Schemas
- registry/ — Core registry skeleton (kinds, variants, policies, transforms)
- examples/ — Example PCMs and GraphQL (to be bundled when extracted)
- publishing.md — How to publish the spec and registry packages

## Extraction plan
This folder is designed to be moved to a new GitHub org/repo (portable-content/spec). After extraction:
- Publish npm package(s) for the registry (@portable-content/registry)
- Publish GitHub Release tarballs for universal consumption
- Optionally create SDK repos: sdk-ts, sdk-php, sdk-py
- Set up portablecontent.dev with a docs site linking to the spec and SDKs

