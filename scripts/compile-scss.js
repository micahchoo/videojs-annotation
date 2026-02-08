#!/usr/bin/env node
/**
 * Compile SCSS to CSS
 * Replaces the gulp-sass + gulp-autoprefixer pipeline
 */

const sass = require('sass');
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, '../src/css/annotations.scss');
const OUTPUT_DIR = path.resolve(__dirname, '../build/css');
const OUTPUT = path.join(OUTPUT_DIR, 'annotations.css');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const result = sass.compile(INPUT, {
  style: 'compressed',
  sourceMap: true
});

fs.writeFileSync(OUTPUT, result.css);
console.log(`Compiled SCSS to ${OUTPUT}`);
