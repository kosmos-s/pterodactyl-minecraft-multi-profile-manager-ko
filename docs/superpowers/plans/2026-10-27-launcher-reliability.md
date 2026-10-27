# Launcher Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Fix the five reproduced v2.2.0 launcher defects, make sources reviewable, harden initial downloads, and provide an independent Claude review prompt.
**Architecture:** Preserve the single-container, one-active-profile layout and POSIX shell launcher. Keep editable shell sources under src/, generate the importable Egg deterministically, and test the generated artifact using temporary profiles and a Java boundary double.
**Tech Stack:** POSIX sh / Alpine ash, Node.js built-in test runner and JSON tooling, GitHub Actions.
**Spec:** User-approved findings in this conversation on 2026-10-27; base commit 79d6f13405d14fdaa451cda312f270800d5ef498.

## Global Constraints

- Preserve existing servers/, profile.conf, Java cache and backup layouts.
- Preserve explicit profile overrides and Memory=0 behavior.
- Do not merge or deploy to a live Pterodactyl server.
- Report shell/fixture evidence separately from live Minecraft acceptance.

## Review Focus

- Overlapping filename patterns must deduplicate paths, but genuinely different JARs must still fail.
- Existing explicit backup overrides must remain authoritative.
- Dry-run must leave files, backups and active-profile state byte-for-byte unchanged.
- Standard Forge/NeoForge scripts must inherit manager JVM options without rewriting their files.
- Current artifact metadata must outrank old logs/caches; ambiguous fallback caches must fail.

## Task 1: Pin the defects and correct launcher behavior

Files: tests/launcher.test.cjs; src/profile-launcher.sh; src/install.sh; tools/build-egg.cjs; egg/egg-minecraft-multi-profile-manager-v2.2.0.json.
- [ ] Write behavioral tests against the existing embedded launcher; run and confirm expected failures for all five findings.
- [ ] Extract the unchanged source and add deterministic Egg generation.
- [ ] Fix exact JAR deduplication, backup inheritance, side-effect-free dry-run, script JVM environment forwarding and version ambiguity.
- [ ] Run all launcher tests, including explicit overrides, Unicode, Memory=0, genuine JAR ambiguity and normal switch backups.
- [ ] Commit the verified launcher/source changes.

## Task 2: Initial download safety

Files: src/install.sh; tests/installer.test.cjs; generated Egg.
- [ ] Test interrupted and invalid downloads, failed checksums, successful promotion and retry after failure.
- [ ] Download to a temporary file, verify ZIP integrity and the official Paper SHA-256, and rename only after validation.
- [ ] Keep custom URL support with optional administrator-supplied SHA-256; do not infer Minecraft version from "latest" for a custom URL.
- [ ] Run the complete suite and commit.

## Task 3: Documentation, CI and handoff

Files: README.md; CONTRIBUTING.md; CHANGELOG.md; docs/MIGRATION-v1-to-v2.md; docs/RESTORE.md; .github/workflows/test.yml; docs/CLAUDE_REVIEW_PROMPT.md.
- [ ] Explain configuration inheritance, script JVM handling, read-only diagnostics and upgrade steps.
- [ ] Remove obsolete Panel patch instructions; add a reversible backup restoration procedure.
- [ ] Add CI for generated-file consistency, shell syntax and the behavioral suite.
- [ ] Run the complete suite, inspect the diff and request one independent whole-branch review.
- [ ] Resolve material findings, prepare a draft PR and provide the Claude prompt.

Execution decision: The user explicitly requested implementation. Continue in this session without an additional plan approval round.
