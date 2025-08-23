# Open Source CRDT Libraries - Active Projects

## Overview

This document provides a comprehensive list of currently active open-source CRDT (Conflict-free Replicated Data Type) libraries across different programming languages. These libraries enable distributed systems to achieve eventual consistency without requiring coordination between nodes.

## JavaScript/TypeScript Libraries

### **Yjs** ⭐ Most Popular
- **Language**: JavaScript/TypeScript
- **GitHub**: https://github.com/yjs/yjs
- **Stars**: ~13k+ stars
- **Status**: Very Active (daily commits)
- **Use Cases**: Real-time collaboration, Google Docs-style editing
- **Key Features**: High performance, rich ecosystem, WebSocket/WebRTC providers
- **Companies Using**: Notion, Figma, Obsidian

### **Automerge**
- **Language**: JavaScript/TypeScript (with Rust core)
- **GitHub**: https://github.com/automerge/automerge
- **Stars**: ~3.5k+ stars
- **Status**: Active (regular releases)
- **Use Cases**: Document collaboration, version control
- **Key Features**: JSON-like API, immutable versions, complete history
- **Companies Using**: Ink & Switch research projects

### **ShareJS/ShareDB**
- **Language**: JavaScript/TypeScript
- **GitHub**: https://github.com/share/sharedb
- **Stars**: ~6k+ stars
- **Status**: Active (maintained)
- **Use Cases**: Real-time collaborative editing
- **Key Features**: Operational Transform, MongoDB integration
- **Companies Using**: Various collaborative editors

### **Fluid Framework**
- **Language**: TypeScript
- **GitHub**: https://github.com/microsoft/FluidFramework
- **Stars**: ~4.5k+ stars
- **Status**: Very Active (Microsoft-backed)
- **Use Cases**: Real-time collaboration, Office 365 integration
- **Key Features**: Distributed data structures, Azure integration
- **Companies Using**: Microsoft (Office, Teams)

### **Replicache**
- **Language**: TypeScript
- **GitHub**: https://github.com/rocicorp/replicache
- **Stars**: ~2k+ stars
- **Status**: Active (commercial backing)
- **Use Cases**: Client-side caching, optimistic updates
- **Key Features**: Offline-first, sync with any backend
- **Companies Using**: Rocicorp and clients

### **Diamond Types**
- **Language**: JavaScript/TypeScript (with Rust core)
- **GitHub**: https://github.com/josephg/diamond-types
- **Stars**: ~1k+ stars
- **Status**: Active (research project)
- **Use Cases**: Text editing, experimental CRDT research
- **Key Features**: High performance text CRDT
- **Author**: Joseph Gentle (ShareJS creator)

### **Loro**
- **Language**: JavaScript/TypeScript (with Rust core)
- **GitHub**: https://github.com/loro-dev/loro
- **Stars**: ~3k+ stars
- **Status**: Very Active (new project, 2023+)
- **Use Cases**: Real-time collaboration, rich text editing
- **Key Features**: High performance, rich data types
- **Companies Using**: Early adoption phase

### **SyncedStore**
- **Language**: TypeScript
- **GitHub**: https://github.com/YousefED/SyncedStore
- **Stars**: ~1.5k+ stars
- **Status**: Active
- **Use Cases**: React/Vue state synchronization
- **Key Features**: Easy React/Vue integration, built on Yjs
- **Companies Using**: Various web applications

## Rust Libraries

### **Automerge-rs**
- **Language**: Rust
- **GitHub**: https://github.com/automerge/automerge-rs
- **Stars**: ~1k+ stars
- **Status**: Very Active (core of Automerge JS)
- **Use Cases**: High-performance CRDT operations
- **Key Features**: Memory efficient, fast operations
- **Integration**: Powers Automerge JavaScript library

### **Diamond Types (Rust)**
- **Language**: Rust
- **GitHub**: https://github.com/josephg/diamond-types
- **Stars**: ~1k+ stars
- **Status**: Active
- **Use Cases**: Text editing, research
- **Key Features**: Extremely fast text CRDT
- **Author**: Joseph Gentle

### **Loro (Rust Core)**
- **Language**: Rust
- **GitHub**: https://github.com/loro-dev/loro
- **Stars**: ~3k+ stars
- **Status**: Very Active
- **Use Cases**: High-performance collaboration
- **Key Features**: Rich data types, excellent performance
- **Bindings**: JavaScript, Python, Swift

### **Y-CRDT**
- **Language**: Rust
- **GitHub**: https://github.com/y-crdt/y-crdt
- **Stars**: ~1k+ stars
- **Status**: Active
- **Use Cases**: Yjs-compatible Rust implementation
- **Key Features**: Compatible with Yjs protocol
- **Integration**: Can interop with Yjs ecosystem

## Python Libraries

### **Pycrdt**
- **Language**: Python (with Rust bindings)
- **GitHub**: https://github.com/jupyter-server/pycrdt
- **Stars**: ~200+ stars
- **Status**: Active (Jupyter project)
- **Use Cases**: Jupyter notebooks, collaborative Python apps
- **Key Features**: Yjs-compatible, Jupyter integration
- **Companies Using**: Jupyter ecosystem

### **Automerge-py**
- **Language**: Python
- **GitHub**: https://github.com/automerge/automerge-py
- **Stars**: ~100+ stars
- **Status**: Active
- **Use Cases**: Python applications needing CRDT
- **Key Features**: Python bindings for Automerge-rs
- **Integration**: Compatible with Automerge ecosystem

## Java/JVM Libraries

### **Akka Distributed Data**
- **Language**: Scala/Java
- **GitHub**: https://github.com/akka/akka
- **Stars**: ~13k+ stars (entire Akka project)
- **Status**: Active (Lightbend-backed)
- **Use Cases**: Distributed systems, actor model
- **Key Features**: Built-in CRDTs, actor integration
- **Companies Using**: Many enterprise applications

### **Riak DT**
- **Language**: Erlang (JVM bindings available)
- **GitHub**: https://github.com/basho/riak_dt
- **Stars**: ~300+ stars
- **Status**: Maintained
- **Use Cases**: Distributed databases
- **Key Features**: Production-tested CRDTs
- **Companies Using**: Riak database users

## Go Libraries

### **go-crdt**
- **Language**: Go
- **GitHub**: https://github.com/neurodyne/go-crdt
- **Stars**: ~100+ stars
- **Status**: Active
- **Use Cases**: Go distributed applications
- **Key Features**: Various CRDT implementations
- **Integration**: Pure Go implementation

### **IPFS Merkle-CRDTs**
- **Language**: Go
- **GitHub**: https://github.com/ipfs/go-merkle-crdt
- **Stars**: ~200+ stars
- **Status**: Active (IPFS project)
- **Use Cases**: Distributed file systems
- **Key Features**: Merkle tree + CRDT combination
- **Companies Using**: IPFS ecosystem

## C/C++ Libraries

### **Concordance**
- **Language**: C++
- **GitHub**: https://github.com/concordance/concordance
- **Stars**: ~100+ stars
- **Status**: Active
- **Use Cases**: High-performance applications
- **Key Features**: Low-level CRDT implementations
- **Integration**: C++ applications

## Swift Libraries

### **CRDT Swift**
- **Language**: Swift
- **GitHub**: https://github.com/appdecentral/crdt-swift
- **Stars**: ~50+ stars
- **Status**: Active
- **Use Cases**: iOS/macOS applications
- **Key Features**: Native Swift CRDT implementations
- **Integration**: iOS/macOS apps

### **Loro Swift Bindings**
- **Language**: Swift (Rust bindings)
- **GitHub**: Part of https://github.com/loro-dev/loro
- **Status**: Active
- **Use Cases**: iOS/macOS collaboration apps
- **Key Features**: High-performance Rust core
- **Integration**: Native Swift API

## Specialized/Research Libraries

### **Peritext**
- **Language**: JavaScript/TypeScript
- **GitHub**: https://github.com/inkandswitch/peritext
- **Stars**: ~500+ stars
- **Status**: Research project (Ink & Switch)
- **Use Cases**: Rich text editing research
- **Key Features**: Advanced text CRDT with formatting
- **Author**: Ink & Switch research lab

### **Collabs**
- **Language**: TypeScript
- **GitHub**: https://github.com/composablesys/collabs
- **Stars**: ~300+ stars
- **Status**: Active (research)
- **Use Cases**: Composable collaborative data structures
- **Key Features**: Modular CRDT library
- **Author**: Academic research project

### **Fugue**
- **Language**: Various implementations
- **GitHub**: https://github.com/archagon/crdt-playground
- **Stars**: ~200+ stars
- **Status**: Research/Educational
- **Use Cases**: CRDT research and education
- **Key Features**: Multiple CRDT algorithm implementations
- **Purpose**: Educational and research

## Database-Integrated CRDTs

### **SurrealDB**
- **Language**: Rust
- **GitHub**: https://github.com/surrealdb/surrealdb
- **Stars**: ~25k+ stars
- **Status**: Very Active
- **Use Cases**: Multi-model database with CRDT support
- **Key Features**: Built-in CRDT data types
- **Companies Using**: Growing adoption

### **AntidoteDB**
- **Language**: Erlang
- **GitHub**: https://github.com/AntidoteDB/antidote
- **Stars**: ~700+ stars
- **Status**: Active (research project)
- **Use Cases**: Geo-distributed databases
- **Key Features**: CRDT-based database
- **Author**: Academic research (multiple universities)

## Recommendations by Use Case

### **For Real-Time Collaboration (Google Docs-style)**
1. **Yjs** (JavaScript) - Most mature, best performance
2. **Loro** (Multi-language) - Newest, excellent performance
3. **Fluid Framework** (TypeScript) - Enterprise, Microsoft-backed

### **For Document Management with History**
1. **Automerge** (JavaScript/Rust) - Complete history, time travel
2. **Loro** (Multi-language) - Rich data types, good history
3. **Peritext** (JavaScript) - Rich text with formatting

### **For Mobile Applications**
1. **Loro** (Swift/Rust bindings) - High performance
2. **Yjs** (React Native compatible) - Mature ecosystem
3. **CRDT Swift** (Native Swift) - Pure Swift implementation

### **For Backend/Server Applications**
1. **Automerge-rs** (Rust) - High performance server
2. **Akka Distributed Data** (JVM) - Enterprise distributed systems
3. **SurrealDB** (Rust) - Database with built-in CRDTs

### **For Research/Experimentation**
1. **Diamond Types** (Rust/JS) - Cutting-edge text CRDTs
2. **Collabs** (TypeScript) - Composable data structures
3. **Peritext** (JavaScript) - Rich text research

## Selection Criteria

When choosing a CRDT library, consider:

1. **Language Ecosystem**: Match your primary development language
2. **Performance Requirements**: Yjs and Loro for high performance
3. **Feature Requirements**: History (Automerge), Real-time (Yjs), Rich text (Peritext)
4. **Maturity**: Yjs most mature, Loro newest but promising
5. **Community**: Yjs has largest community and ecosystem
6. **Commercial Support**: Fluid Framework (Microsoft), Replicache (commercial)
7. **Integration**: Consider existing infrastructure and frameworks

## Current Trends (2024)

- **Rust-based cores** with language bindings (Automerge, Loro, Diamond Types)
- **Focus on performance** and memory efficiency
- **Rich data type support** beyond just text
- **Better developer experience** with familiar APIs
- **Mobile and native app support** increasing
- **Database integration** becoming more common

This list represents the most active and promising CRDT libraries as of 2024. The field is rapidly evolving with new projects and improvements to existing ones.
