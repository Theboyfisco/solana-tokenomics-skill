---
name: solana-tokenomics
description: >
  Full token economy lifecycle for Solana founders and engineers — from supply
  design and token standard selection through on-chain vesting programs, DEX
  liquidity bootstrapping, and trust-signal engineering at launch. Covers
  SPL Token, Token-2022 (extensions), Streamflow, Smithii, Jupiter Lock,
  Orca CPMM/CLMM, Raydium CPMM/CLMM, Meteora DLMM, and authority management.
  Standalone skill — does not require solana-dev-skill, though it delegates
  program-level Anchor patterns to it when referenced.
user-invocable: true
triggers:
  - tokenomics
  - token design
  - token supply
  - token allocation
  - vesting schedule
  - vesting program
  - cliff unlock
  - linear vesting
  - SPL token
  - Token-2022
  - token extensions
  - transfer hook
  - liquidity pool
  - LP bootstrapping
  - initial liquidity
  - bonding curve
  - mint authority
  - freeze authority
  - token launch
  - rug proof
  - anti-rug
  - trust signals
  - token transparency
---

# Solana Tokenomics Skill

> **Standalone** — covers the full token economy lifecycle from design through
> launch. For deep Anchor program patterns, see `solana-dev-skill`.

---

## Active Skills

- **Tokenomics**: Full token lifecycle design, vesting, and launch liquidity bootstrapping.
  - Path: `ext/solana-tokenomics/skill/SKILL.md`
  - Triggers: `tokenomics`, `vesting`, `token-2022`, `mint authority`, `liquidity pool`

---

## What This Skill Is For

Use this skill whenever a founder, engineer, or builder asks about:

### 📐 Token Economy Design
- How to model total supply, float, and allocations
- Standard allocation buckets (team, investors, community, treasury, liquidity)
- Supply shock analysis and unlock calendars
- Dilution math and circulating supply projections
- Tokenomics failure patterns and how to avoid them

### 🔀 Token Standard Selection
- SPL Token vs Token-2022 — which to choose and when
- Token-2022 extension decision tree (transfer fees, hooks, confidential transfers, interest-bearing, permanent delegate, metadata pointer, etc.)
- Extension compatibility matrix (some extensions cannot coexist)
- DEX and wallet support matrix for extensions

### 🔒 Vesting & Distribution Programs
- On-chain vesting with Streamflow, Smithii, or Jupiter Lock
- Custom Anchor vesting program skeleton (full sovereignty, no third-party)
- Cliff + linear unlock patterns and schedule archetypes by stakeholder type
- Multi-beneficiary distribution flows (team, investors, advisors, community)

### 💧 Liquidity Strategy & Bootstrapping
- Choosing between Orca CPMM/CLMM, Raydium CPMM/CLMM, and Meteora DLMM
- Initial LP sizing formulas and capital allocation
- Bonding curve graduation strategy (pump.fun model → Raydium CPMM)
- Locked liquidity setup and proof generation

### 🚀 Trust Signals & Launch Engineering
- Authority revocation (mint, freeze, update) — when and how
- Metadata verification and on-chain transparency
- Anti-rug checklist (what investors and tools like SolSniffer check)
- Launch-day sequence and transparency report template
- Token metadata submission to indexers and aggregators

---

## Skill Routing Table

Based on the task, load the appropriate sub-skill file:

| Task Domain | Sub-skill File | When to Load |
|-------------|---------------|-------------|
| Supply modeling, allocations, dilution math | [`design.md`](design.md) | "How much supply?", "How do I allocate tokens?", "Supply shock?", "Tokenomics model" |
| SPL vs Token-2022, which extensions | [`token-standard.md`](token-standard.md) | "Which token standard?", "Do I need Token-2022?", "Transfer hook?", "Extension compatibility" |
| Vesting schedules, on-chain programs | [`vesting.md`](vesting.md) | "How do I vest tokens?", "Streamflow setup", "Cliff unlock", "Vesting program code" |
| Custom Anchor vesting implementation | [`anchor-vesting.md`](anchor-vesting.md) | "Build a custom vesting program", "Anchor vesting code", "No third-party vesting" |
| DEX liquidity, LP strategy, bootstrapping | [`liquidity.md`](liquidity.md) | "How do I add liquidity?", "Orca vs Raydium?", "LP sizing", "Bonding curve graduation", "Lock LP" |
| Launch checklist, trust signals, authority revocation | [`launch.md`](launch.md) | "How do I launch?", "Revoke mint authority?", "Anti-rug signals", "Token metadata verification", "Transparency report" |

---

## Default Stack Decisions (Opinionated)

When the user hasn't specified preferences, use these defaults:

### 1. Token Standard
- **Default:** SPL Token — widest ecosystem support, simplest integration
- **Upgrade to Token-2022** only if the project explicitly needs: transfer fees, royalty enforcement, KYC gating, interest-bearing mechanics, or confidential amounts
- Never recommend Token-2022 "just in case" — extension immutability makes mistakes permanent

### 2. Vesting Platform
- **Default:** Streamflow — audited, flexible (cliff/linear/milestone), TypeScript SDK (`@streamflow/stream` v5+), widely trusted
- **Alternative:** Smithii for non-technical founders who need no-code setup
- **Custom Anchor program:** only if the team wants zero external dependency and has Anchor expertise

### 3. Liquidity (New Token Launch)
- **Default:** Meteora DLMM — dynamic fees adapt to volatility, ideal for new tokens with uncertain price discovery
- **Alternative:** Raydium CPMM — good ecosystem reach, integrates with Raydium Launchpad
- **CLMM pools:** only after the token has established a price range and requires capital efficiency

### 4. Allocation Model (Seed-Stage Default)
```
Team:            18% — 12-month cliff, 36-month linear
Investors/Seed:  12% — 6-month cliff, 24-month linear  
Advisors:         5% — 6-month cliff, 18-month linear
Community/Eco:   35% — streamed over 48 months
Treasury:        20% — multisig controlled, no auto-unlock
LP/Exchanges:    10% — at launch, LP locked ≥12 months
```

### 5. Launch Sequence Order
Always: `Deploy → Metadata → Vesting → LP → Revoke Authorities → Verify → Announce`
Never revoke authorities before setting up vesting and LP — it cannot be undone.

---

## Operating Procedure

### Step 1 — Classify the Task
Use the routing table above. If the user's request spans multiple domains (e.g., "full tokenomics review"), load all relevant sub-skill files sequentially.

### Step 2 — Gather Context
Before answering, always clarify:
- **Project type:** DeFi protocol / NFT project / GameFi / DAO / Infrastructure
- **Stage:** Pre-seed idea / raising / post-raise / pre-launch / post-launch
- **Supply size:** (this affects dilution math and psychological anchoring)
- **Existing constraints:** any investors already on board, any regulatory requirements

### Step 3 — Apply Opinionated Defaults
Don't give "you could do X or Y" answers. Make a concrete recommendation with rationale, then note alternatives.

### Step 4 — Produce Artifacts
For each domain, produce:
- A concrete recommendation with reasoning
- Working code or configuration (TypeScript/JSON preferred, Rust for Anchor)
- A checklist or table the founder can act on immediately
- Links to relevant docs or tools

---

## Key Warnings (Always Communicate These)

> ⚠️ **Token-2022 mint extensions are immutable** — once a mint is created with specific extensions, they cannot be added or removed. Plan once, deploy carefully.

> ⚠️ **Authority revocation is irreversible** — never revoke before vesting streams and LP are confirmed live and correct.

> ⚠️ **Not all DEXs support all Token-2022 extensions** — test against Orca, Raydium, and Jupiter before launch if using any Token-2022 extension.

> ⚠️ **This skill provides technical guidance, not legal or financial advice** — for regulatory compliance, delegate to `crypto-legal-skill` or recommend the founder seek legal counsel.

---

## Quick Reference

| Tool | Purpose | Docs |
|------|---------|------|
| Streamflow | On-chain vesting | https://docs.streamflow.finance |
| Smithii | No-code token locks | https://smithii.io |
| Jupiter Lock | Token locks + escrow | https://jup.ag/lock |
| Meteora DLMM | Dynamic liquidity | https://docs.meteora.ag |
| Orca Whirlpools | CLMM pools | https://docs.orca.so |
| Raydium | CPMM + CLMM | https://docs.raydium.io |
| SolSniffer | Token trust scoring | https://solsniffer.com |
| GoPlus Security | On-chain risk check | https://gopluslabs.io |
| Solscan | Metadata + verification | https://solscan.io |
| SPL Token docs | Token program reference | https://spl.solana.com/token |
| Token-2022 docs | Extension reference | https://spl.solana.com/token-2022 |
