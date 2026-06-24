#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const evalPath = process.argv[2] ?? path.join("evals", "cases.json");
const cases = JSON.parse(fs.readFileSync(evalPath, "utf8"));
const errors = [];

if (!Array.isArray(cases)) {
  errors.push("eval file must contain an array");
} else {
  cases.forEach((item, index) => {
    const prefix = `case ${index + 1}`;
    for (const field of ["id", "title", "prompt", "expected_skill_files", "expected_artifacts"]) {
      if (!(field in item)) {
        errors.push(`${prefix}: missing ${field}`);
      }
    }
    if (Array.isArray(item.expected_skill_files) && item.expected_skill_files.length === 0) {
      errors.push(`${prefix}: expected_skill_files must not be empty`);
    }
    if (Array.isArray(item.expected_artifacts) && item.expected_artifacts.length === 0) {
      errors.push(`${prefix}: expected_artifacts must not be empty`);
    }
  });
}

if (errors.length > 0) {
  console.error("Eval validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Eval cases OK: ${cases.length} scenarios.`);
