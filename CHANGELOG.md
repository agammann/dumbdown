# Changelog

Version 1.0.5 remains an unpublished source candidate.

## 1.0.5

- Update Vite to 8.3.8 and its supported Rolldown dependency for the [upstream development-server advisory](https://github.com/vitejs/vite/security/advisories/GHSA-p4f5-76q4-ffq7).
- Mark native explanations as consequential operations with untrusted generated output. Keep the local stdio provider call explicitly non-read-only.
- Bound local stdio arguments to 32 elements and derive CLI/MCP version reporting from the source package.
- Align contributor prerequisites with the supported Node 24 and Node 26 ranges.

## 1.0.4

Include the patched Hono 4.13.18 dependency in the source release and update ESLint to the compatible 9.39.5 maintenance version. Keep the existing lint rules and verification gates.

## 1.0.3

Update locked Hono server, esbuild and lint dependencies to their compatible maintenance versions.

## 1.0.2

Refresh a locked server dependency to its compatible maintenance release.

## 1.0.1

Read the caller-selected source through one bounded file handle and reject files that change before the provider request. Verify the exact release tag before publishing a new source ZIP. The user still chooses which local file to send to the configured provider.

## 1.0.0

Provide a source release with checksums, setup and recovery instructions for the web app, CLI and stdio MCP server. The verified GPT-5.4 hosted path is the initial browser choice; key entry, consent and an explicit request are still required. The Node adapters now default to GPT-5.4 and use the web workflow's explanation instructions, bounded response reading and sanitized cancellation/errors. Device models remain explicitly experimental; generated explanations still require review against their source.

Correct development-page rendering, apply the available dependency patches and add repeatable ordinary/native browser checks, including credential clearing, cancellation, Markdown exports and mobile layouts. Publish only from the exact checked main commit, preserving earlier tags and releases.
