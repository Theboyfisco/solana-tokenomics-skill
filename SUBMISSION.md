# Superteam Bounty Submission Notes

## Project

`solana-tokenomics-skill`

Repo: https://github.com/Theboyfisco/solana-tokenomics-skill

## One-Sentence Pitch

An AI skill for Solana founders and engineers that turns token launch planning into a structured workflow: supply design, Token-2022/SPL selection, vesting, liquidity bootstrapping, authority revocation, and transparency reporting.

## Problem Solved

Solana teams often handle tokenomics through scattered docs, spreadsheets, Discord advice, and one-off scripts. That creates repeated launch mistakes: weak vesting, undisclosed unlocks, incompatible Token-2022 extensions, thin liquidity, unrevokeable or unrevealed authorities, and missing trust artifacts.

This skill gives coding agents a practical operating system for that workflow.

## Why It Belongs In The Solana AI Kit

- It fills a gap between core development skills, DeFi integration skills, security skills, and startup/GTM skills.
- It is cross-domain: product, engineering, liquidity, launch ops, and trust signaling.
- It follows the reference skill shape: `skill/SKILL.md` router, focused sub-skill files, install script, examples, validation scripts, and MIT license.
- It uses progressive loading: custom Anchor vesting code is split into `anchor-vesting.md` and only loaded when needed.

## What Judges Can Run

```bash
npm run validate
```

This checks:

- `examples/supply-model.json` balances to 100% and matches summary math.
- The skill has the expected Solana AI Kit structure and routing.
- The eval scenarios are well-formed.
- The demo transcripts exist and are linked from the README.

## Suggested PR Description

```markdown
## Summary

Adds `solana-tokenomics-skill`, a progressive Solana AI Kit skill for token economy design and launch execution.

## Includes

- `skill/SKILL.md` router
- focused sub-skills for supply design, token standard selection, vesting, custom Anchor vesting, liquidity, and launch trust signals
- example tokenomics model
- Streamflow-oriented vesting dry-run template
- validation scripts and eval cases
- demo transcripts for realistic founder workflows
- MIT license and installer

## Why

Tokenomics and launch trust artifacts are recurring Solana founder pain points that are not fully covered by the current coding, security, DeFi, or startup skills.

## Validation

- `npm run validate`
```
