# MDWriter - AI Coding Instructions

## Project Overview
MDWriter is an **ElectronJS-based, cross-platform structured writing application** for drafting Module Descriptors. The project is in early development stages.

## Technology Stack
- **Framework**: Electron (for cross-platform desktop application)
- **Target Platforms**: Windows, macOS, Linux
- **Purpose**: Structured writing tool specifically designed for Module Descriptors

## Project Structure (Intended)
Since this is a new project, follow standard Electron conventions:
- `src/main/` - Electron main process code (Node.js environment)
- `src/renderer/` - Renderer process code (browser environment, UI)
- `src/preload/` - Preload scripts for secure IPC
- `dist/` or `build/` - Compiled output
- `package.json` - Dependencies and build scripts

## Development Conventions

### Electron Architecture
- **Main Process**: Handle file system operations, native menus, window management
- **Renderer Process**: UI components and user interactions
- **IPC Communication**: Use contextBridge for secure main-renderer communication
- **Security**: Enable context isolation, disable nodeIntegration in renderer

### Module Descriptor Support
This is a **structured writing application**, meaning:
- Enforce specific document structure for Module Descriptors
- Provide templates or scaffolding for standard sections
- Validate content against expected schema/format
- Consider guided workflows for completing required fields

### Cross-Platform Considerations
- Test UI on all target platforms (Windows, macOS, Linux)
- Use Electron's built-in APIs for platform-specific features
- Handle file paths with `path.join()` and `path.resolve()`
- Consider platform-specific packaging (electron-builder or electron-forge)

## Development Workflow
When setting up or extending this project:

1. **Initialize Electron project** if not already done
2. **Choose build tooling**: webpack, Vite, or electron-forge
3. **Select UI framework**: React, Vue, or vanilla JS based on team preference
4. **Implement auto-updates** for cross-platform distribution
5. **Add TypeScript** for better type safety (recommended for Electron projects)

## Key Questions to Address
Since the project is nascent, clarify these aspects before major implementation:
- What format are Module Descriptors? (JSON, YAML, custom format?)
- What structure/schema must they follow?
- Will there be import/export functionality?
- Are there collaboration features or is it single-user?
- What's the expected deployment method? (installers, app stores, portable)

## Reference
- See `SPECIFICATION.md` for high-level requirements
