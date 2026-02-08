/*
    Helper functions for template rendering, replacing Handlebars helpers.
*/

/**
 * Escape HTML entities to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Convert newlines to <br> tags after escaping HTML.
 * This is the equivalent of the Handlebars `breaklines` helper.
 * @param {string} text
 * @returns {string}
 */
export function breaklines(text) {
  if (typeof text !== 'string') return text;
  return escapeHtml(text).replace(/(\r\n|\n|\r)/g, '<br>');
}

/**
 * Safe string interpolation for template literals.
 * Usage: html`<div>${userInput}</div>`
 * Not used currently but kept for completeness.
 */
export function html(strings, ...values) {
  return strings.reduce((result, str, i) => {
    const val = i < values.length ? escapeHtml(String(values[i])) : '';
    return result + str + val;
  }, '');
}

export default { escapeHtml, breaklines, html };
