#!/usr/bin/env node

/**
 * Script multiplataforma para calcular e incrementar versiones SemVer en package.json
 * Uso: node bump-version.js <major|minor|patch|check>
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.resolve(process.cwd(), 'package.json');

if (!fs.existsSync(packageJsonPath)) {
  console.error("❌ Error: No se encontró package.json en el directorio actual.");
  process.exit(1);
}

const type = (process.argv[2] || '').toLowerCase();
if (!['major', 'minor', 'patch', 'check'].includes(type)) {
  console.log("Uso: node bump-version.js <major|minor|patch|check>");
  console.log("  major : Incrementa X (1.0.0 -> 2.0.0) [Breaking Changes]");
  console.log("  minor : Incrementa Y (1.0.0 -> 1.1.0) [Nuevas funcionalidades / Features]");
  console.log("  patch : Incrementa Z (1.0.0 -> 1.0.1) [Corrección de errores / Bug fixes]");
  console.log("  check : Muestra la versión actual y posibles incrementos");
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version || '0.0.0';
const parts = currentVersion.split('.').map(Number);

if (parts.length !== 3 || parts.some(isNaN)) {
  console.error(`❌ Error: La versión actual "${currentVersion}" no cumple el formato SemVer X.Y.Z`);
  process.exit(1);
}

const [major, minor, patch] = parts;

if (type === 'check') {
  console.log(`Versión actual: ${currentVersion}`);
  console.log(`- Próximo PATCH : ${major}.${minor}.${patch + 1}`);
  console.log(`- Próximo MINOR : ${major}.${minor + 1}.0`);
  console.log(`- Próximo MAJOR : ${major + 1}.0.0`);
  process.exit(0);
}

let newVersion = '';
if (type === 'major') {
  newVersion = `${major + 1}.0.0`;
} else if (type === 'minor') {
  newVersion = `${major}.${minor + 1}.0`;
} else if (type === 'patch') {
  newVersion = `${major}.${minor}.${patch + 1}`;
}

packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');

console.log(`✅ Versión actualizada: ${currentVersion} -> ${newVersion} (${type.toUpperCase()})`);
