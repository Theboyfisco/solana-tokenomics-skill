# Demo Transcript: New Token Liquidity Launch Plan

## User Prompt

We are launching a new Solana token with unstable price discovery. Compare Meteora DLMM and Raydium CPMM, size the initial LP, and give us a launch-day sequence with lock proof.

## Skill Routing

Loaded:

- `skill/SKILL.md`
- `skill/liquidity.md`
- `skill/design.md`
- `skill/launch.md`

## Agent Response

Default recommendation: start with Meteora DLMM if you expect high volatility and uncertain price discovery. Use Raydium CPMM if you care more about simplicity, broad familiarity, and a conventional pool shape.

DEX comparison:

| Option | Strength | Risk | Best Fit |
|--------|----------|------|----------|
| Meteora DLMM | Dynamic fees, bin-based liquidity, better volatility handling | More parameters to configure and monitor | New tokens with unstable price discovery |
| Raydium CPMM | Simple x*y=k pool, familiar launch path, strong ecosystem reach | Less capital efficient and less adaptive to volatility | Simpler public launches and teams with limited market-making capacity |

Initial LP sizing:

Assume:

- Total supply: 1,000,000,000
- LP allocation: 10% = 100,000,000 tokens
- Target TGE price: $0.01

Token-side value:

```text
100,000,000 tokens x $0.01 = $1,000,000
```

Required paired side:

```text
$1,000,000 in USDC or SOL-side value
```

Total initial LP:

```text
$2,000,000 total pool value
```

If that paired capital is not realistic, lower the target TGE price or reduce the LP token allocation. Do not create a thin pool at an inflated FDV; it will look good in marketing and weak on-chain.

Recommended launch plan:

1. Deploy token mint on mainnet.
2. Confirm metadata renders correctly.
3. Create team/investor vesting streams.
4. Create Meteora DLMM pool or Raydium CPMM pool.
5. Add initial liquidity.
6. Lock LP tokens for at least 12 months.
7. Record lock proof URL.
8. Revoke freeze authority.
9. Revoke mint authority if fixed supply.
10. Publish transparency report before announcing.

Transparency fields to publish:

| Field | Example |
|-------|---------|
| Pool | Meteora DLMM |
| Pool address | `POOL_ADDRESS` |
| LP amount | `100M TOKEN + 1M USDC` |
| LP lock | `LOCK_PROOF_URL` |
| Lock expiry | `YYYY-MM-DD` |
| Mint authority | Revoked or documented |
| Freeze authority | Revoked |

## Output Artifacts Produced

- DEX recommendation
- LP sizing calculation
- Lock strategy
- Launch sequence

