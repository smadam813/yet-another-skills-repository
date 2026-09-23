# Changelog

All notable changes to razor are documented here. The version number lives in
both plugin manifests, `.claude-plugin/plugin.json` and
`.cursor-plugin/plugin.json`.

## 2.0.0 — 2026-09-22

razor starts again at 2.0.0 as this repo's own plugin. Sessions behave as they
did in 1.6.7, with one fix: `/razor:unused` no longer reports a `package.json`
that fails to parse as a project whose dependencies are all imported. It skips
that manifest.
