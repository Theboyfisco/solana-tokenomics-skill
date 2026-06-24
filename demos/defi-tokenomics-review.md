# Demo Transcript: Seed-Stage DeFi Tokenomics Review

## User Prompt

We are a seed-stage Solana DeFi protocol planning a 1B supply token. Team wants 25%, investors want 20%, community gets 25%, treasury 20%, and LP 10%. Review the model and propose a stronger allocation, vesting, and launch float.

## Skill Routing

Loaded:

- `skill/SKILL.md`
- `skill/design.md`
- `skill/vesting.md`
- `skill/launch.md`

## Agent Response

Your current model is too insider-heavy for a public Solana launch.

Team plus investors equals 45% of supply, while community is only 25%. That creates three problems:

- It weakens the decentralization story.
- It creates heavy future sell pressure from private allocations.
- It makes the project harder to defend in a transparency report.

Recommended revision:

| Bucket | Current | Recommended | Rationale |
|--------|--------:|------------:|-----------|
| Team | 25% | 18% | Still meaningful, but closer to credible market norms |
| Investors | 20% | 12% | Reduces private-round overhang |
| Advisors | 0% | 3% | Makes advisor grants explicit instead of hidden inside team/community |
| Community/Ecosystem | 25% | 35% | Stronger decentralization and contributor incentive story |
| Treasury | 20% | 22% | Keeps runway and emergency reserve under multisig control |
| Initial LP | 10% | 10% | Good launch allocation if paired capital is realistic |

Revised 1B supply model:

| Bucket | Tokens | Vesting / Control |
|--------|-------:|-------------------|
| Team | 180,000,000 | 12-month cliff, 36-month linear |
| Investors | 120,000,000 | 6-month cliff, 24-month linear |
| Advisors | 30,000,000 | 6-month cliff, 18-month linear |
| Community/Ecosystem | 350,000,000 | Governed emissions over 48 months |
| Treasury | 220,000,000 | Squads multisig, no automatic unlock |
| Initial LP | 100,000,000 | Locked for at least 12 months |

Launch float recommendation:

- Target effective TGE float: 10-15%.
- Include LP tokens and any public airdrop/IDO in the float calculation.
- Do not unlock team, advisor, or investor tokens at TGE.

Example TGE float:

| Source | Tokens | % Supply |
|--------|-------:|---------:|
| Initial LP | 100,000,000 | 10% |
| Public/community launch distribution | 35,000,000 | 3.5% |
| Team/investor/advisor unlocks | 0 | 0% |
| Total effective launch float | 135,000,000 | 13.5% |

Required launch artifacts:

- Allocation table with wallet categories.
- Supply shock calendar covering every cliff and monthly stream.
- Streamflow links or custom vesting program addresses for private allocations.
- Treasury multisig address and signer threshold.
- LP pool address and lock proof.
- Mint/freeze authority status with transaction hashes.

## Output Artifacts Produced

- Revised allocation model
- TGE float calculation
- Vesting plan by stakeholder
- Launch transparency checklist

