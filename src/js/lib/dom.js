/*
    Vanilla DOM utilities to replace jQuery usage across the plugin.
    Provides cross‑browser safe, minimal equivalents for the most common jQuery methods.
*/

/**
 * Parse an HTML string into a DOM element (or DocumentFragment for multiple roots).
 * @param {string} html
 * @param {boolean} single - If true, returns the first child element (default). If false, returns a DocumentFragment.
 * @returns {Element|DocumentFragment}
 */
export function htmlToEl(html, single = true) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  const content = template.content;
  return single ? content.firstElementChild : content;
}

/**
 * Create an element with optional class and text content.
 * @param {string} tag
 * @param {string} className
 * @param {string} text
 * @returns {Element}
 */
export function createElement(tag, className = '', text = '') {
  const el = document.createElement(tag);
  if (className) addClass(el, className);
  if (text) setText(el, text);
  return el;
}

/**
 * Query selector within a parent (or document).
 * @param {Element|Document} parent
 * @param {string} selector
 * @returns {Element|null}
 */
export function qs(parent, selector) {
  return parent.querySelector(selector);
}

/**
 * Query selector all within a parent.
 * @param {Element|Document} parent
 * @param {string} selector
 * @returns {Element[]}
 */
export function qsa(parent, selector) {
  return Array.from(parent.querySelectorAll(selector));
}

/**
 * Find closest ancestor matching selector.
 * @param {Element} el
 * @param {string} selector
 * @returns {Element|null}
 */
export function closest(el, selector) {
  return el.closest(selector);
}

// classList wrappers
export function addClass(el, className) {
  if (el && className) el.classList.add(className);
}
export function removeClass(el, className) {
  if (el && className) el.classList.remove(className);
}
export function toggleClass(el, className, force) {
  if (el && className) el.classList.toggle(className, force);
}
export function hasClass(el, className) {
  return el && el.classList.contains(className);
}

/**
 * Get or set attribute.
 * @param {Element} el
 * @param {string} attr
 * @param {string} [value]
 * @returns {string|void}
 */
export function attr(el, attr, value) {
  if (value === undefined) return el.getAttribute(attr);
  el.setAttribute(attr, value);
}

/**
 * Get or set data attribute (data-*).
 * @param {Element} el
 * @param {string} key - without 'data-' prefix
 * @param {string} [value]
 * @returns {string|void}
 */
export function data(el, key, value) {
  const fullKey = `data-${key}`;
  if (value === undefined) return el.getAttribute(fullKey);
  el.setAttribute(fullKey, value);
}

/**
 * Set innerHTML of an element.
 * @param {Element} el
 * @param {string} html
 */
export function setHtml(el, html) {
  el.innerHTML = html;
}

/**
 * Set textContent of an element.
 * @param {Element} el
 * @param {string} text
 */
export function setText(el, text) {
  el.textContent = text;
}

/**
 * Get or set value of form element.
 * @param {Element} el
 * @param {string} [value]
 * @returns {string|void}
 */
export function getVal(el, value) {
  if (value === undefined) return el.value;
  el.value = value;
}

// DOM manipulation
export function append(parent, child) {
  parent.appendChild(child);
}
export function before(el, ref) {
  if (ref.parentNode) ref.parentNode.insertBefore(el, ref);
}
export function remove(el) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}
export function replaceWith(el, newEl) {
  if (el.parentNode) el.parentNode.replaceChild(newEl, el);
}

// Dimensions and positions (return numbers in pixels)
export function offset(el) {
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top + window.pageYOffset,
    left: rect.left + window.pageXOffset,
    right: rect.right + window.pageXOffset,
    bottom: rect.bottom + window.pageYOffset
  };
}

export function position(el) {
  const rect = el.getBoundingClientRect();
  const parentRect = el.offsetParent
    ? el.offsetParent.getBoundingClientRect()
    : { top: 0, left: 0 };
  return {
    top: rect.top - parentRect.top,
    left: rect.left - parentRect.left
  };
}

export function width(el, includeMargin = false) {
  if (includeMargin) {
    const style = window.getComputedStyle(el);
    const marginLeft = parseFloat(style.marginLeft) || 0;
    const marginRight = parseFloat(style.marginRight) || 0;
    return el.offsetWidth + marginLeft + marginRight;
  }
  return el.offsetWidth;
}

export function height(el, includeMargin = false) {
  if (includeMargin) {
    const style = window.getComputedStyle(el);
    const marginTop = parseFloat(style.marginTop) || 0;
    const marginBottom = parseFloat(style.marginBottom) || 0;
    return el.offsetHeight + marginTop + marginBottom;
  }
  return el.offsetHeight;
}

export function outerWidth(el, includeMargin = false) {
  if (includeMargin) {
    const style = window.getComputedStyle(el);
    const marginLeft = parseFloat(style.marginLeft) || 0;
    const marginRight = parseFloat(style.marginRight) || 0;
    return el.offsetWidth + marginLeft + marginRight;
  }
  return el.offsetWidth;
}

export function outerHeight(el, includeMargin = false) {
  if (includeMargin) {
    const style = window.getComputedStyle(el);
    const marginTop = parseFloat(style.marginTop) || 0;
    const marginBottom = parseFloat(style.marginBottom) || 0;
    return el.offsetHeight + marginTop + marginBottom;
  }
  return el.offsetHeight;
}

export function innerWidth(el) {
  return el.clientWidth;
}

export function innerHeight(el) {
  return el.clientHeight;
}

/**
 * Set multiple CSS properties at once.
 * @param {Element} el
 * @param {Object} styles
 */
export function css(el, styles) {
  Object.assign(el.style, styles);
}

/**
 * Get or set scrollTop of an element.
 * @param {Element} el
 * @param {number} [value]
 * @returns {number|void}
 */
export function scrollTop(el, value) {
  if (value === undefined) return el.scrollTop;
  el.scrollTop = value;
}

/**
 * Get the computed style property.
 * @param {Element} el
 * @param {string} prop
 * @returns {string}
 */
export function getStyle(el, prop) {
  return window.getComputedStyle(el)[prop];
}

/**
 * Check if element is visible (not hidden via display or visibility).
 * @param {Element} el
 * @returns {boolean}
 */
export function isVisible(el) {
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

/**
 * Insert after reference element.
 * @param {Element} newNode
 * @param {Element} referenceNode
 */
export function insertAfter(newNode, referenceNode) {
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

/**
 * Empty an element (remove all children).
 * @param {Element} el
 */
export function empty(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

export default {
  htmlToEl,
  createElement,
  qs,
  qsa,
  closest,
  addClass,
  removeClass,
  toggleClass,
  hasClass,
  attr,
  data,
  setHtml,
  setText,
  getVal,
  append,
  before,
  remove,
  replaceWith,
  offset,
  position,
  width,
  height,
  outerWidth,
  outerHeight,
  innerWidth,
  innerHeight,
  css,
  scrollTop,
  getStyle,
  isVisible,
  insertAfter,
  empty
};
