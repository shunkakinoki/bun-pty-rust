# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2025-10-18

### Fixed
- Fixed bash -c command failures due to improper shell argument escaping
- Added proper quoting for arguments containing spaces or special characters

### Changed
- Added quoteArg function to automatically handle shell argument escaping
- Added additional fallback path for library resolution in development environments
- Updated integration tests to use proper argument quoting

## [0.2.0] - 2025-10-18

### Added
- Environment variable support: processes can now receive custom environment variables via `env` option
- Spillover buffer to prevent data loss during high-volume PTY output
- Integration test for large output without data loss (1000+ lines)
- Comprehensive integration tests for environment variable functionality
- Test coverage for special characters in environment variables

### Fixed
- Fixed data truncation bug where bytes exceeding the read buffer were discarded
- Fixed library path resolution to work in both development (src/) and production (dist/)
- Fixed TypeScript type issues with `IPtyForkOptions.name` (now optional)
- Simplified library filename resolution (removed architecture-specific naming)

### Changed
- Default to parent process environment when `env` option is not specified
- Clear inherited environment and use only provided env vars for better isolation
- Improved test scripts in package.json
