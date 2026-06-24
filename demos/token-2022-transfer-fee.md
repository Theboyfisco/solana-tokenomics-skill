# Demo Transcript: Token-2022 Transfer-Fee Decision

## User Prompt

Our token should collect a 1% fee on every transfer and route it to protocol revenue. Should we use SPL Token or Token-2022, and what must we test before launch?

## Skill Routing

Loaded:

- `skill/SKILL.md`
- `skill/token-standard.md`
- `skill/launch.md`

## Agent Response

Use Token-2022 with `TransferFeeConfig`.

Classic SPL Token cannot enforce a protocol-level transfer fee at the token program level. Token-2022 is the right choice when the fee is a core requirement, but you should treat this as an integration-risk decision rather than a simple mint setting.

Recommended mint extensions:

| Extension | Use |
|-----------|-----|
| `TransferFeeConfig` | Enforces the 1% transfer fee |
| `MetadataPointer` | Optional, if you want Token-2022 native metadata routing |

Avoid adding these unless truly required:

| Extension | Why to avoid by default |
|-----------|-------------------------|
| `TransferHook` | Higher integration risk and more failure paths |
| `PermanentDelegate` | Major trust concern unless required for regulated assets |
| `ConfidentialTransfers` | Poor fit for normal AMM liquidity and indexer support |

Fee configuration:

- Fee basis points: `100` for 1%.
- Set a max-fee cap so large transfers are not punished unexpectedly.
- Use a multisig-controlled fee authority, not a single deployer wallet.
- Document who can update the fee and under what governance process.

Pre-launch validation plan:

| Area | Test |
|------|------|
| Wallets | Send, receive, display balance, show fee behavior |
| DEXs | Create pool, swap both directions, confirm quotes account for fee |
| Aggregators | Confirm routes do not fail or misquote |
| Accounting | Harvest withheld fees and withdraw to treasury |
| Indexers | Confirm explorers and portfolio tools display supply and transfers correctly |
| Trust | Publish fee config, max fee, authority address, and governance controls |

Launch warning:

Token-2022 mint extensions are immutable. If you deploy the wrong extension set, you cannot patch the existing mint. Run the exact mint configuration through devnet or a mainnet-fork workflow before mainnet deployment.

## Output Artifacts Produced

- Token standard recommendation
- Extension selection
- Integration risk checklist
- Authority and disclosure plan

