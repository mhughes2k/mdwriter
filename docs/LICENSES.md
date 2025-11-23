# Third-Party Licenses

This document outlines the licenses of third-party components used in MDWriter's development and runtime.

## Overview

MDWriter depends on the following open-source components:

### License Summary
- **MIT**: 249 packages (majority)
- **ISC**: 57 packages
- **Apache-2.0**: 8 packages
- **BSD-2-Clause**: 7 packages
- **BSD-3-Clause**: 6 packages
- **BlueOak-1.0.0**: 5 packages
- **Python-2.0**: 1 package
- **Other permissive licenses**: 3 packages

All dependencies use permissive open-source licenses compatible with commercial and non-commercial use.

## Production Dependencies

These libraries are bundled with the distributed application:

### JSON Schema Validation
- **ajv** (v8.17.1) - MIT License
  - Another JSON Schema Validator
  - Author: Evgeny Poberezkin
  - https://github.com/ajv-validator/ajv

- **ajv-errors** (v3.0.0) - MIT License
  - Custom error messages for Ajv
  - https://github.com/epoberezkin/ajv-errors

- **ajv-formats** (v3.0.1) - MIT License
  - Format validation for Ajv (email, date, etc.)
  - https://github.com/ajv-validator/ajv-formats

### Supporting Libraries
- **fast-deep-equal** (v3.1.3) - MIT License
  - Deep equality testing (used by Ajv)
  
- **fast-uri** (v3.1.0) - BSD-3-Clause License
  - URI parsing library
  
- **json-schema-traverse** (v1.0.0) - MIT License
  - JSON schema traversal utility
  
- **require-from-string** (v2.0.2) - MIT License
  - Load Node.js modules from string

## Development Dependencies

These tools are used only during development and are not distributed:

### Application Framework
- **Electron** (v28.3.3) - MIT License
  - Cross-platform desktop application framework
  - https://github.com/electron/electron
  - Includes Chromium and Node.js binaries

### Build Tools
- **electron-builder** (v26.0.12) - MIT License
  - Complete solution for packaging Electron apps
  - Creates installers for Windows (NSIS), macOS (DMG), and Linux (AppImage, deb)
  - https://github.com/electron-userland/electron-builder

## Notable Transitive Dependencies

Key indirect dependencies included through Electron and electron-builder:

- **Chromium** - BSD-3-Clause (embedded in Electron)
- **Node.js** - MIT License (embedded in Electron)
- **7-Zip** - LGPL (used by electron-builder for compression)
- **NSIS** - zlib/libpng license (Windows installer creation)

## License Compatibility

All dependencies use licenses that are:
- ✅ Compatible with proprietary/commercial software
- ✅ Do not require source code disclosure
- ✅ Permissive for modification and redistribution
- ✅ Compatible with the ISC License (MDWriter's current license)

## Updating This Document

To regenerate license information:

```bash
# Summary view
npx license-checker --summary

# Detailed production dependencies
npx license-checker --production

# Full dependency tree with licenses
npx license-checker --json > licenses.json
```

## Attribution Requirements

### MIT License
Requires preservation of copyright notices and license text. All MIT-licensed dependencies are properly attributed in their respective `node_modules/*/LICENSE` files, which are included in distribution builds.

### BSD Licenses
Require acknowledgment in documentation and binaries. This document serves as that acknowledgment.

### Apache 2.0 License
Requires preservation of copyright notices and NOTICE files. All Apache-licensed dependencies maintain their attribution in `node_modules`.

---

**Last Updated**: 23 November 2025  
**MDWriter Version**: 0.1.0  

For the license governing MDWriter's source code, see [LICENSE.md](../LICENSE.md) in the repository root.
