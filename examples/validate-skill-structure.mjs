#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "README.md",
  "LICENSE",
  "install.sh",
  "skill/SKILL.md",
  "skill/design.md",
  "skill/token-standard.md",
  "skill/vesting.md",
  "skill/anchor-vesting.md",
  "skill/liquidity.md",
  "skill/launch.md",
  "examples/supply-model.json",
  "examples/vesting-schedule.ts",
  "demos/defi-tokenomics-review.md",
  "demos/token-2022-transfer-fee.md",
  "demos/liquidity-launch-plan.md",
];

const errors = [];

for (const file of requiredFiles) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    errors.push(`missing required file: ${file}`);
  }
}

const readmePath = path.join(root, "README.md");
if (fs.existsSync(readmePath)) {
  const readme = fs.readFileSync(readmePath, "utf8");
  for (const demo of [
    "demos/defi-tokenomics-review.md",
    "demos/token-2022-transfer-fee.md",
    "demos/liquidity-launch-plan.md",
  ]) {
    if (!readme.includes(demo)) {
      errors.push(`README.md does not link to ${demo}`);
    }
  }
}

const skillPath = path.join(root, "skill", "SKILL.md");
if (fs.existsSync(skillPath)) {
  const skill = fs.readFileSync(skillPath, "utf8");
  if (!skill.startsWith("---\n")) {
    errors.push("skill/SKILL.md must start with YAML frontmatter");
  }
  for (const field of ["name:", "description:", "user-invocable:"]) {
    if (!skill.includes(field)) {
      errors.push(`skill/SKILL.md frontmatter missing ${field}`);
    }
  }
  for (const routed of ["design.md", "token-standard.md", "vesting.md", "anchor-vesting.md", "liquidity.md", "launch.md"]) {
    if (!skill.includes(routed)) {
      errors.push(`skill/SKILL.md does not route to ${routed}`);
    }
  }
}

for (const file of requiredFiles.filter((item) => item.endsWith(".md"))) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) {
    continue;
  }
  const lines = fs.readFileSync(fullPath, "utf8").split(/\r?\n/).length;
  if (file.startsWith("skill/") && lines > 450) {
    errors.push(`${file} has ${lines} lines; keep sub-skill files focused for progressive loading`);
  }
}

if (errors.length > 0) {
  console.error("Skill structure validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Skill structure OK.");
