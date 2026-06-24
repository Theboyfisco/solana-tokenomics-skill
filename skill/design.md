# Token Supply Design & Allocation

> Part of [solana-tokenomics-skill](SKILL.md). Load this file when the user asks
> about total supply, allocation percentages, vesting math, circulating supply,
> supply shocks, or tokenomics modeling.

---

## 1. Choosing Total Supply

Total supply is a psychological and mechanical decision — it has no inherent economic meaning (what matters is market cap = price × circulating supply), but it shapes how users perceive your token.

### Common Supply Ranges

| Range | Best For | Example |
|-------|---------|---------|
| 1M – 10M | Premium, "blue-chip" feel | Rare NFT collections |
| 100M – 1B | Standard utility/governance tokens | Most DeFi protocols |
| 1B – 10B | High retail distribution, low unit price perception | Meme-adjacent tokens |
| 100B – 1T | Meme / community tokens, micro-unit pricing | Dogecoin-inspired projects |

**Recommendation:** For a serious DeFi or infrastructure project, **1B total supply** is the most common, credible default in 2026. It gives you enough granularity for airdrops, enough for whale participation, and a unit price that isn't intimidating.

### Fixed vs. Inflationary Supply

- **Fixed supply (no mint authority):** Most credible signal of scarcity. Strongly preferred for governance and store-of-value tokens. Revoke mint authority at launch.
- **Inflationary (controlled mint):** Valid for staking rewards, protocol emissions, or liquidity mining — but document the emission schedule precisely and cap total eventual supply.
- **Deflationary (burn mechanism):** Effective for fee-based burn models (e.g., burn X% of protocol revenue). Implement via a burn instruction, not transfer-to-dead-wallet.

---

## 2. Allocation Buckets

### Reference Allocation Model (Seed-Stage Protocol)

```
Total Supply: 1,000,000,000 tokens (1B)

┌─────────────────────────────────────────────────────────┐
│  Allocation     │  %   │  Tokens      │  Vesting        │
├─────────────────┼──────┼──────────────┼─────────────────┤
│  Team           │  18% │  180,000,000 │  12mo cliff,    │
│                 │      │              │  36mo linear    │
├─────────────────┼──────┼──────────────┼─────────────────┤
│  Seed investors │   8% │   80,000,000 │  6mo cliff,     │
│                 │      │              │  24mo linear    │
├─────────────────┼──────┼──────────────┼─────────────────┤
│  Strategic/A    │   7% │   70,000,000 │  3mo cliff,     │
│                 │      │              │  18mo linear    │
├─────────────────┼──────┼──────────────┼─────────────────┤
│  Advisors       │   3% │   30,000,000 │  6mo cliff,     │
│                 │      │              │  18mo linear    │
├─────────────────┼──────┼──────────────┼─────────────────┤
│  Community/Eco  │  35% │  350,000,000 │  Governed,      │
│                 │      │              │  streamed 48mo  │
├─────────────────┼──────┼──────────────┼─────────────────┤
│  Treasury       │  19% │  190,000,000 │  Multisig,      │
│                 │      │              │  no auto-unlock │
├─────────────────┼──────┼──────────────┼─────────────────┤
│  Initial LP     │  10% │  100,000,000 │  Locked ≥12mo   │
└─────────────────┴──────┴──────────────┴─────────────────┘

Circulating at TGE (Token Generation Event):
  LP tokens: 100M (locked in pool, technically circulating but illiquid)
  Airdrop/IDO from community: ~35M (if any public distribution at launch)
  Effective float at TGE: ~13.5% of total supply
```

### Stakeholder Bucket Guidelines

**Team (15–20%)**
- Minimum 12-month cliff is now the market standard — anything less is a red flag
- Recommend 36 months total (cliff + linear) for protocol founders
- Include all full-time contributors; part-timers get proportionally less
- Use Streamflow or a custom Anchor program — not a simple time-lock

**Investors (10–20% total across all rounds)**
- Seed: 6–12 month cliff, 18–24 month linear
- Series A: 3–6 month cliff, 12–18 month linear
- Be transparent about investor unlock dates — publish them at TGE

**Advisors (3–7%)**
- 6–12 month cliff, 12–18 month linear
- Keep tight — advisor tokens are the most commonly abused allocation
- Require active engagement milestones if possible

**Community & Ecosystem (30–40%)**
- The largest allocation signals credibility and genuine decentralization intent
- Distribute via: airdrops, liquidity mining, grants, hackathons, retroactive rewards
- Stream slowly — a 48-month community emission is healthier than a 6-month dump
- Never send community tokens to a single EOA (externally owned account) without a DAO

**Treasury (15–25%)**
- Controlled by a multisig (recommend Squads Protocol on Solana)
- No automatic unlock — releases require governance vote or multisig approval
- Fund: audits, infrastructure, partnerships, emergency reserve
- Publish treasury wallet address at TGE

**Initial Liquidity (5–15%)**
- Lock LP tokens immediately — no exceptions
- Budget in both tokens AND SOL/USDC for the paired side
- See [`liquidity.md`](liquidity.md) for sizing formulas

---

## 3. Dilution Math

### Fully Diluted Valuation (FDV) vs. Market Cap
```
Market Cap = Current Price × Circulating Supply
FDV        = Current Price × Total Supply

Example:
  Total supply: 1,000,000,000
  Price at TGE: $0.05
  Circulating:  135,000,000 (13.5%)

  Market Cap = $0.05 × 135M  = $6,750,000
  FDV        = $0.05 × 1,000M = $50,000,000

  FDV/MC ratio = 7.4x — this means if price holds, market cap will grow
                  7.4x just from unlock events. Investors see this as
                  significant future sell pressure.
```

**Target at TGE:** FDV/MC ratio of 3–7x is generally acceptable. Above 10x signals to sophisticated buyers that dumps are coming.

### Unlock Event Impact Estimate
```
Price Impact of Unlock ≈ (Tokens_Unlocked / Avg_Daily_Volume) × Price_Elasticity

Conservative estimate: 1% of daily volume unlocking = ~0.5–2% price impact
Aggressive estimate:   10%+ of daily volume        = potential 5–20% correction

Rule of thumb: ensure your LP depth can absorb the largest single unlock
               event without moving price more than 15%.
```

---

## 4. Supply Shock Calendar

A supply shock calendar maps every unlock event by date. Publish this at TGE — it is a major trust signal.

### Calendar Template (JSON)
```json
{
  "token": "TICKER",
  "total_supply": 1000000000,
  "tge_date": "2026-01-01",
  "unlock_events": [
    {
      "date": "2026-01-01",
      "label": "TGE — Initial LP",
      "tokens": 100000000,
      "pct_of_supply": "10%",
      "category": "liquidity",
      "note": "Locked in pool for 12 months"
    },
    {
      "date": "2026-07-01",
      "label": "Seed investors cliff ends",
      "tokens": 0,
      "pct_of_supply": "0%",
      "note": "Cliff ends, linear streaming begins. ~3.3M/month for 24 months"
    },
    {
      "date": "2027-01-01",
      "label": "Team cliff ends",
      "tokens": 0,
      "pct_of_supply": "0%",
      "note": "Cliff ends, linear streaming begins. ~5M/month for 36 months"
    }
  ]
}
```

See [`../examples/supply-model.json`](../examples/supply-model.json) for a complete worked example.

---

## 5. Common Failure Patterns

### ❌ 100% Circulating at Launch
Never launch with all tokens circulating. Even meme coins with instant liquidity should have some structure.

### ❌ Team Cliff Under 6 Months
Signals short-termism. 2026 investors filter this out immediately. Minimum credible cliff: 12 months.

### ❌ No Treasury Reserve
Projects that run out of money 8 months post-launch due to no treasury are extremely common. Treasury should be minimum 15% of supply.

### ❌ LP Under 1% of FDV
Thin liquidity means any moderate sell order craters the price. Minimum LP should be able to absorb 1% of your expected daily volume without 10%+ slippage.

### ❌ Investor Allocation > Team Allocation
This signals the project is more about the cap table than the product. Keep investor total ≤ team total.

### ❌ All Community Tokens Distributed in Year 1
Removes long-term incentive alignment. Stream community rewards over 3–5 years.

### ❌ Undisclosed Insider Allocations
Wallets that received large allocations without disclosure will be discovered on-chain. Publish all allocations at TGE.

---

## 6. Tokenomics Review Checklist

Before finalizing your tokenomics model:

- [ ] FDV/MC ratio at TGE is under 10x (ideally 3–7x)
- [ ] Team cliff is ≥ 12 months
- [ ] All investor allocations have vesting schedules
- [ ] Treasury is ≥ 15% of supply, controlled by multisig
- [ ] Community allocation is ≥ 30% of supply
- [ ] LP allocation is 5–15%, locked ≥ 12 months
- [ ] Supply shock calendar published at TGE
- [ ] No single wallet (excluding treasury multisig) holds > 10% of supply
- [ ] Emission schedule (if inflationary) is fixed and documented
- [ ] Burn mechanism (if any) is audited and capped

---

## Related Sub-skills
- Token standard decisions → [`token-standard.md`](token-standard.md)
- Implementing vesting on-chain → [`vesting.md`](vesting.md)
- LP allocation and sizing → [`liquidity.md`](liquidity.md)
- Publishing this model at launch → [`launch.md`](launch.md)
