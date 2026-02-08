/*
    Geneal utility functions, sourced from underscore & scratch built as needed
*/

module.exports = {
  // Clone an object
  cloneObject: obj => ({ ...obj }),

  // Like Object.assign but skips prototype-polluting keys
  safeAssign: (target, source) => {
    if (!source || typeof source !== 'object') return target;
    Object.keys(source).forEach(key => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') return;
      target[key] = source[key];
    });
    return target;
  },

  // Strip anything not [a-zA-Z0-9_-] from a CSS class name
  sanitizeCSSClassName: str => {
    if (!str) return '';
    return String(str).replace(/[^a-zA-Z0-9_-]/g, '');
  },

  // Clamp a number within a range
  clampNumber: (val, min, max) => {
    return Math.max(min, Math.min(max, parseFloat(val) || 0));
  },

  // Validate a range object: start/end must be finite numbers >= 0, end > start when present
  validateRange: range => {
    if (!range || typeof range !== 'object') return range;
    if (range.start !== undefined) {
      range.start = parseFloat(range.start);
      if (!isFinite(range.start) || range.start < 0) range.start = 0;
    }
    if (range.end !== undefined && range.end !== null) {
      range.end = parseFloat(range.end);
      if (!isFinite(range.end) || range.end < 0) range.end = 0;
      if (range.start !== undefined && range.end <= range.start) range.end = range.start + 1;
    }
    return range;
  },

  // Validate a shape object: clamp x1/y1/x2/y2 to [0, 100], ensure all are numbers
  validateShape: shape => {
    if (!shape || typeof shape !== 'object') return shape;
    const clamp = (val, min, max) => Math.max(min, Math.min(max, parseFloat(val) || 0));
    shape.x1 = clamp(shape.x1, 0, 100);
    shape.y1 = clamp(shape.y1, 0, 100);
    shape.x2 = clamp(shape.x2, 0, 100);
    shape.y2 = clamp(shape.y2, 0, 100);
    return shape;
  },

  // Sanitize HTML string to only allow safe elements and attributes
  sanitizeCommentHTML: html => {
    if (!html) return '';
    const allowedTags = { DIV: true, SPAN: true, BR: true, B: true };
    const allowedAttrs = { 'class': true, 'data-id': true };

    const temp = document.createElement('div');
    temp.innerHTML = html;

    function walkAndClean(node) {
      const children = Array.from(node.childNodes);
      children.forEach(child => {
        if (child.nodeType === 3) return; // text node - keep
        if (child.nodeType === 1) { // element node
          if (!allowedTags[child.tagName]) {
            // Replace disallowed element with its text content
            const text = document.createTextNode(child.textContent);
            node.replaceChild(text, child);
            return;
          }
          // Remove disallowed attributes
          Array.from(child.attributes).forEach(attr => {
            if (!allowedAttrs[attr.name]) child.removeAttribute(attr.name);
          });
          walkAndClean(child);
        } else {
          node.removeChild(child);
        }
      });
    }
    walkAndClean(temp);
    return temp.innerHTML;
  },

  // Simple relative time formatter (replaces moment.fromNow())
  timeAgo: dateStr => {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    if (isNaN(then)) return '';
    const seconds = Math.floor((now - then) / 1000);
    if (seconds < 0) return 'just now';
    if (seconds < 60) return 'a few seconds ago';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes === 1 ? 'a minute ago' : `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours === 1 ? 'an hour ago' : `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return days === 1 ? 'a day ago' : `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return months === 1 ? 'a month ago' : `${months} months ago`;
    const years = Math.floor(months / 12);
    return years === 1 ? 'a year ago' : `${years} years ago`;
  },

  // _throttle from underscore
  throttle: (func, wait, options) => {
    let context;
    let args;
    let result;
    let timeout = null;
    let previous = 0;
    if (!options) options = {};
    const later = function() {
      previous = options.leading === false ? 0 : Date.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      const now = Date.now();
      if (!previous && options.leading === false) previous = now;
      const remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  },

  // Parse all keys of an object to number (int or float)
  parseIntObj: (obj, asFloat = false) => {
    Object.keys(obj).forEach(key => {
      if (asFloat) {
        const f = parseFloat(obj[key]);
        if (!isNaN(f)) obj[key] = f;
      } else {
        if (parseInt(obj[key])) {
          obj[key] = parseInt(obj[key]);
        }
      }
    });
    return obj;
  },

  // Convert a range {start: int, (optional) end: int} to human readable time
  humanTime: range => {
    function readable(sec) {
      const mins = Math.floor(sec / 60);
      const secs = String(sec % 60);
      return `${mins}:${secs.length == 1 ? '0' : ''}${secs}`;
    }
    const time = [readable(range.start)];
    if (range.end) time.push(readable(range.end));
    return time.join('-');
  },

  // Pseduo-random guid generator
  guid: () => {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return `${s4() + s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
  },

  // Returns the height and width of an element that is not visible
  // clones el and tricks DOM into rendering it w the correct size
  // beware the container may be important for scoped styles
  areaOfHiddenEl: (el, container, hideClass = '') => {
    const clone = el.cloneNode(true);
    const data = {};
    clone.style.visibility = 'hidden';
    clone.style.display = 'inline-block';
    if (hideClass) clone.classList.remove(hideClass);
    container.appendChild(clone);
    const rect = clone.getBoundingClientRect();
    data.width = rect.width;
    data.height = rect.height;
    container.removeChild(clone);
    return data;
  },

  // Convert a range to human readable frame numbers
  humanTimeFrames: (range, frameRate) => {
    const startFrame = Math.round(range.start * frameRate);
    const str = [`F${startFrame}`];
    if (range.end) str.push(`F${Math.round(range.end * frameRate)}`);
    return str.join(' - ');
  },

  // Determine if a value (n) is within a range (start <= n <= end)
  isWithinRange: (start, end, n) => {
    end = end || start + 1; // for ranges with NO end defined, assume a 1s range
    return n >= start && n <= end;
  }
};
