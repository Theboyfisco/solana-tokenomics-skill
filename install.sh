#!/usr/bin/env bash
# install.sh — solana-tokenomics-skill installer
# Usage: bash install.sh [target-project-dir]
#
# Installs the skill into .claude/skills/ or .agents/skills/ depending on
# what's present in the target directory. Defaults to current directory.

set -euo pipefail

SKILL_NAME="solana-tokenomics"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_SRC="$SCRIPT_DIR/skill"
TARGET_BASE="${1:-.}"
TARGET_BASE="$(cd "$TARGET_BASE" && pwd)"

# ─── Detect install target ────────────────────────────────────────────────────
if [ -d "$TARGET_BASE/.claude" ]; then
  DEST="$TARGET_BASE/.claude/skills/$SKILL_NAME"
  CONFIG_TYPE="Claude Code (.claude/)"
elif [ -d "$TARGET_BASE/.agents" ]; then
  DEST="$TARGET_BASE/.agents/skills/$SKILL_NAME"
  CONFIG_TYPE="Agents (.agents/)"
else
  # Default to .claude — create it
  DEST="$TARGET_BASE/.claude/skills/$SKILL_NAME"
  CONFIG_TYPE="Claude Code (.claude/) [created]"
fi

# ─── Install ──────────────────────────────────────────────────────────────────
echo ""
echo "  solana-tokenomics-skill installer"
echo "  ──────────────────────────────────"
echo "  Source:  $SKILL_SRC"
echo "  Target:  $DEST"
echo "  Config:  $CONFIG_TYPE"
echo ""

if [ -d "$DEST" ]; then
  echo "  WARNING: Skill already installed at $DEST"
  read -r -p "  Overwrite? [y/N] " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "  Aborted."
    exit 0
  fi
  rm -rf "$DEST"
fi

mkdir -p "$DEST"
cp -r "$SKILL_SRC/"* "$DEST/"

# ─── Optional: copy examples ──────────────────────────────────────────────────
if [ -d "$SCRIPT_DIR/examples" ]; then
  EXAMPLES_DEST="$DEST/examples"
  mkdir -p "$EXAMPLES_DEST"
  cp -r "$SCRIPT_DIR/examples/"* "$EXAMPLES_DEST/"
fi

echo "  Installed: $DEST"
echo ""
echo "  Next steps:"
echo "    1. Reload your Claude Code session (or restart your agent)"
echo "    2. The skill auto-activates when you ask about token design,"
echo "       vesting, liquidity strategy, or token launch"
echo "    3. Or explicitly invoke: 'Use the solana-tokenomics skill to...'"
echo ""
echo "  Docs: https://github.com/Theboyfisco/solana-tokenomics-skill"
echo ""
