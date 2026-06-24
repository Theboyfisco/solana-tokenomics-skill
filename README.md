# solana-tokenomics-skill

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Solana](https://img.shields.io/badge/Solana-mainnet--2026-black?logo=solana)](https://solana.com)
[![Claude Code](https://img.shields.io/badge/Claude_Code-skill-orange)](https://github.com/solanabr/solana-ai-kit)
[![Kit Compatible](https://img.shields.io/badge/solana--ai--kit-compatible-green)](https://github.com/solanabr/solana-ai-kit)

> **A Claude Code skill that helps coding agents design, review, and launch Solana token economies.**

Every Solana project eventually asks the same questions: *How do I design my tokenomics? Which token standard do I use? How do I set up on-chain vesting? How do I bootstrap liquidity? What do I need to do to not get flagged as a rug?*

This skill provides opinionated, implementation-oriented guidance for all of them, progressively loaded so it does not bloat the agent context window.

---

## The Problem

There is no unified AI skill in the Solana ecosystem that covers the full token economy lifecycle. Founders bounce between:

- Streamflow docs for vesting
- Raydium / Orca / Meteora docs for liquidity
- Token-2022 SPL docs for extension selection
- Discord threads for what trust signals matter
- Spreadsheets for supply modeling

This skill replaces that scattered workflow with a single routed context that helps an agent produce reviewable, founder-ready artifacts.

---

## What's Included

```
solana-tokenomics-skill/
├── skill/
│   ├── SKILL.md              ← Entry point & router (load this first)
│   ├── design.md             ← Supply modeling, allocations, dilution math
│   ├── token-standard.md     ← SPL vs Token-2022 decision tree + extension code
│   ├── vesting.md            ← Streamflow workflow + schedule archetypes
│   ├── anchor-vesting.md     ← Custom Anchor vesting skeleton, loaded only when needed
│   ├── liquidity.md          ← DEX strategy, LP sizing, Meteora/Raydium/Orca templates
│   └── launch.md             ← Authority revocation, trust signals, launch checklist
└── examples/
    ├── supply-model.json     ← Complete tokenomics template (fill in & ship)
    ├── vesting-schedule.ts   ← Streamflow TypeScript dry-run/template
    ├── validate-supply-model.mjs
    ├── validate-skill-structure.mjs
    └── validate-evals.mjs
├── evals/
│   └── cases.json            ← Scenario set for judging and regression checks
└── demos/
    ├── defi-tokenomics-review.md
    ├── token-2022-transfer-fee.md
    └── liquidity-launch-plan.md
```

### Skill Coverage

| Domain | What the skill provides |
|--------|------------------------|
| **Supply Design** | Allocation model, dilution math, FDV/MC ratio, supply shock calendar, failure patterns |
| **Token Standard** | SPL vs Token-2022 decision tree, extension code snippets, compatibility notes, integration risk matrix |
| **Vesting** | Streamflow workflow, batch schedule builder, schedule archetypes by stakeholder, custom Anchor skeleton in a separate file |
| **Liquidity** | Meteora DLMM, Raydium CPMM, Orca CLMM setup templates, LP sizing formulas, bonding curve graduation, lock strategies |
| **Launch** | Authority revocation (TypeScript), metadata verification, anti-rug checklist, transparency report template, hour-by-hour launch sequence |

---

## Install

### Option 1 — Install script with target

```bash
git clone https://github.com/Theboyfisco/solana-tokenomics-skill.git
cd solana-tokenomics-skill
bash install.sh /path/to/your-project
```

### Option 2 — Git submodule (for monorepos)

```bash
git submodule add https://github.com/Theboyfisco/solana-tokenomics-skill.git ext/solana-tokenomics
bash ext/solana-tokenomics/install.sh .
```

### Option 3 — Manual copy

```bash
cp -r skill/ .claude/skills/solana-tokenomics/
# or
cp -r skill/ .agents/skills/solana-tokenomics/
```

After installing, reload your Claude Code session.

---

## Usage

The skill activates automatically when you ask about token design, vesting, liquidity, or launch. You can also invoke it explicitly:

```
Use the solana-tokenomics skill to help me design the tokenomics for my DeFi protocol.

I need to set up on-chain vesting for my team (3 people) and 2 seed investors.

Which token standard should I use — my protocol needs to take a small fee on every swap using our token.

Help me bootstrap liquidity on Meteora for my new token launch.

What do I need to do before announcing my token launch to avoid getting flagged as a rug?
```

---

## Skill Architecture (Progressive Loading)

The skill uses progressive disclosure — the router (`SKILL.md`) loads first and identifies which sub-skill file to load based on the task. Only the relevant sub-skill is loaded into context.

```
User asks: "How do I set up vesting?"
     │
     ▼
SKILL.md (router) — classifies task
     │
     ▼
vesting.md — loaded into context
  ├── Streamflow workflow
  └── Stakeholder schedule archetypes

User asks: "Build a custom Anchor vesting program"
     │
     ▼
anchor-vesting.md — loaded only for custom program implementation
```

This keeps token usage low even though each sub-skill has substantial depth.

---

## Stack Assumptions

The guidance targets the current Solana ecosystem and should be verified against project dependency versions before mainnet use:

| Tool | Version | Used In |
|------|---------|---------|
| `@solana/spl-token` | v0.4+ | token-standard.md, launch.md |
| `@streamflow/stream` | v5+ | vesting.md |
| `@meteora-ag/dlmm` | current project version | liquidity.md |
| `@raydium-io/raydium-sdk-v2` | v2+ | liquidity.md |
| `@orca-so/whirlpools-sdk` | current project version | liquidity.md |
| Anchor | 0.30+ | vesting.md |
| Token-2022 Program | current | token-standard.md |
| Squads Protocol | v4 | design.md, launch.md |

---

## Related Skills in the Solana AI Kit

This skill is standalone but plays well with:

- **[solana-dev-skill](https://github.com/solana-foundation/solana-dev-skill)** — for deep Anchor program development patterns
- **[sendaifun/skills](https://github.com/sendaifun/skills)** — for protocol-level DeFi integrations (Jupiter, Raydium, Kamino)
- **[crypto-legal-skill](https://github.com/solanabr/crypto-legal-skill)** — for regulatory and compliance guidance (MiCA, stablecoins)
- **[position-manager-skill](https://github.com/solanabr/position-manager-skill)** — for ongoing CLMM position management after launch

---

## Examples

### `supply-model.json`
A complete tokenomics model with all 7 allocation buckets, supply shock calendar, authority status, LP details, and security fields. Copy, fill in your values, publish at TGE.

### `vesting-schedule.ts`
A Streamflow-oriented TypeScript template for planning team and investor vesting streams. It defaults to dry-run mode and includes guardrails so placeholder values cannot be sent by accident.
- Dry-run mode prints all stream configs
- Instruction-generation path is gated behind `STREAMFLOW_EXECUTE=true`
- Query mode helps inspect active streams
- Transparency report generation from created stream metadata

```bash
npm install @streamflow/stream @solana/web3.js bn.js ts-node typescript

# Dry run — preview all stream configs
npx ts-node examples/vesting-schedule.ts create

# Generate Streamflow instructions after replacing all placeholders
STREAMFLOW_EXECUTE=true TOKEN_MINT=<mint> npx ts-node examples/vesting-schedule.ts create

# Query active streams
npx ts-node examples/vesting-schedule.ts query <SENDER_ADDRESS>
```

### `validate-supply-model.mjs`
Checks that the example tokenomics model balances to 100%, that bucket token amounts match percentages, and that summary fields are internally consistent.

```bash
node examples/validate-supply-model.mjs examples/supply-model.json
```

### `evals/cases.json`
Small scenario set for manual or automated judging. Each case defines a realistic founder request, the skill files that should load, and the output artifacts expected from a strong agent response.

```bash
node examples/validate-evals.mjs evals/cases.json
```

### `demos/`
Short demo transcripts showing how the skill routes realistic founder prompts into concrete outputs. These are meant for judges to skim quickly.

- [`demos/defi-tokenomics-review.md`](demos/defi-tokenomics-review.md)
- [`demos/token-2022-transfer-fee.md`](demos/token-2022-transfer-fee.md)
- [`demos/liquidity-launch-plan.md`](demos/liquidity-launch-plan.md)

---

## Submission Strength

This skill is built to score on the bounty criteria:

| Criterion | How this repo addresses it |
|-----------|----------------------------|
| Usefulness | Covers a recurring founder workflow: supply design, vesting, liquidity, launch trust signals |
| Novelty | Adds token economy design and launch engineering, which is not covered by the core Solana coding/security skills |
| Quality | Progressive routing, concrete defaults, examples, validation scripts, eval scenarios, explicit mainnet warnings |
| Fit | Matches the reference skill shape: `skill/SKILL.md`, focused sub-skill files, `install.sh`, README, MIT license |

Before submitting, run `npm run validate`.

---

## Contributing

PRs welcome. If you're extending this skill:

1. Keep sub-skill files under ~400 lines — progressive loading matters
2. All code examples must be tested against the current stack
3. Opinionated defaults over "here are your options"
4. Add new domains as new sub-skill files, update the routing table in `SKILL.md`

---

## License

MIT — see [LICENSE](LICENSE).

---

*Submitted to the [Superteam Solana AI Kit Skill Bounty](https://superteam.fun) · Skill Kit: [solanabr/solana-ai-kit](https://github.com/solanabr/solana-ai-kit)*
# solana-tokenomics-skill
