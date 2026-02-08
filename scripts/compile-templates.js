#!/usr/bin/env node
/**
 * Standalone Handlebars template compiler
 * Replaces the gulp-handlebars + gulp-declare + gulp-concat + gulp-wrap pipeline
 * Compiles all .hbs files in src/templates/ to src/js/compiled/templates.js
 *
 * Output format: exports.templates = { name: Handlebars.template(...), ... }
 * Consumed by: player_ui_component.js → templates[templateName](options)
 */

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');

const TEMPLATES_DIR = path.resolve(__dirname, '../src/templates');
const OUTPUT_FILE = path.resolve(__dirname, '../src/js/compiled/templates.js');

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read all .hbs files
const hbsFiles = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.hbs'));

let output = 'var Handlebars = require("handlebars/runtime");\n';
output += 'exports["templates"] = {};\n';

hbsFiles.forEach(file => {
  const name = path.basename(file, '.hbs');
  const source = fs.readFileSync(path.join(TEMPLATES_DIR, file), 'utf8');
  const precompiled = Handlebars.precompile(source);

  output += `exports["templates"]["${name}"] = Handlebars.template(${precompiled});\n`;
});

fs.writeFileSync(OUTPUT_FILE, output);
console.log(`Compiled ${hbsFiles.length} templates to ${OUTPUT_FILE}`);
