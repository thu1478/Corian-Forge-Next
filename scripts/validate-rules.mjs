#!/usr/bin/env node
/**
 * CLI validator for lib/rules.json — uses @corian-forge/rules-kit
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { hasValidationErrors, validateRulesDocument } from "../packages/rules-kit/dist/index.js"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const rulesPath = path.join(root, "lib", "rules.json")

let rules
try {
    rules = JSON.parse(fs.readFileSync(rulesPath, "utf8"))
} catch (err) {
    console.error("Failed to read rules.json:", err)
    process.exit(1)
}

const issues = validateRulesDocument(rules)
const errors = issues.filter((i) => i.severity === "error")
const warnings = issues.filter((i) => i.severity === "warning")

for (const issue of issues) {
    const tag = issue.severity === "error" ? "ERROR" : "WARN"
    console.log(`${tag} [${issue.code}] ${issue.path}: ${issue.message}`)
}

console.log("")
console.log(`Validation complete: ${errors.length} error(s), ${warnings.length} warning(s)`)

if (hasValidationErrors(issues)) {
    process.exit(1)
}
