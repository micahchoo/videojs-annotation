/*
    EventManager: provides namespaced event binding/unbinding and delegation to replace jQuery's .on/.off.
    Uses native addEventListener/removeEventListener with namespace tracking.

    Example usage:
        const em = new EventManager();
        em.on(el, 'click.vac-marker', handler);
        em.on(el, 'click.vac-comment', '.child-sel', handler); // delegation
        em.off(el, 'click.vac-marker');
        em.off(el, '.vac-marker'); // unbind all events in namespace
        em.offAll(); // teardown everything
*/

class EventManager {
  constructor() {
    // WeakMap to store element -> Map<eventType+namespace, {handler, originalHandler, selector?}>
    this._bindings = new WeakMap();
  }

  /**
   * Add event listener with optional namespace and delegation.
   * @param {Element} el
   * @param {string} eventName - e.g., 'click.vac-marker'
   * @param {string|Function} selectorOrHandler - either a selector string for delegation, or the handler function
   * @param {Function} [handler] - if selector provided, this is the handler
   * @returns {Function} unbind function for this specific binding
   */
  on(el, eventName, selectorOrHandler, handler) {
    if (!el || !eventName) return () => {};

    const [type, namespace] = this._parseEventName(eventName);
    const isDelegation = typeof selectorOrHandler === 'string';
    const selector = isDelegation ? selectorOrHandler : null;
    const fn = isDelegation ? handler : selectorOrHandler;

    if (!fn || typeof fn !== 'function') {
      throw new Error('EventManager.on: missing or invalid handler');
    }

    // Create the actual listener
    const listener = isDelegation
      ? (e) => {
          let target = e.target;
          // Walk up to find matching selector
          while (target && target !== el) {
            if (target.matches(selector)) {
              fn.call(target, e);
              break;
            }
            target = target.parentElement;
          }
        }
      : fn;

    // Store binding for later removal
    const key = `${type}.${namespace || 'default'}`;
    const binding = { type, namespace, selector, fn, listener };

    if (!this._bindings.has(el)) {
      this._bindings.set(el, new Map());
    }
    this._bindings.get(el).set(key, binding);

    el.addEventListener(type, listener);
    return () => this._offSingle(el, key);
  }

  /**
   * Remove event listeners matching criteria.
   * @param {Element} el
   * @param {string} [eventName] - e.g., 'click.vac-marker' or '.vac-marker' (any event in namespace) or empty for all
   */
  off(el, eventName = '') {
    if (!el || !this._bindings.has(el)) return;

    const bindings = this._bindings.get(el);
    if (!eventName) {
      // Remove all events for this element
      for (const [key, binding] of bindings) {
        el.removeEventListener(binding.type, binding.listener);
      }
      bindings.clear();
      return;
    }

    if (eventName.startsWith('.')) {
      // Remove all events in this namespace
      const namespace = eventName.slice(1);
      for (const [key, binding] of bindings) {
        if (binding.namespace === namespace) {
          el.removeEventListener(binding.type, binding.listener);
          bindings.delete(key);
        }
      }
      return;
    }

    // Specific event+namespace
    const [type, namespace] = this._parseEventName(eventName);
    const key = `${type}.${namespace || 'default'}`;
    this._offSingle(el, key);
  }

  /**
   * Remove all events tracked by this manager.
   */
  offAll() {
    for (const [el, bindings] of this._bindings) {
      for (const [key, binding] of bindings) {
        el.removeEventListener(binding.type, binding.listener);
      }
      bindings.clear();
    }
    this._bindings = new WeakMap();
  }

  /**
   * Trigger an event on an element (simulate jQuery .trigger).
   * @param {Element} el
   * @param {string} eventName - e.g., 'click'
   * @param {*} [data] - optional data to attach to event.detail
   */
  trigger(el, eventName, data = null) {
    const [type] = this._parseEventName(eventName);
    const event = new CustomEvent(type, { detail: data, bubbles: true, cancelable: true });
    el.dispatchEvent(event);
  }

  // --- internal helpers ---
  _parseEventName(eventName) {
    const dot = eventName.indexOf('.');
    if (dot === -1) return [eventName, ''];
    return [eventName.slice(0, dot), eventName.slice(dot + 1)];
  }

  _offSingle(el, key) {
    const bindings = this._bindings.get(el);
    if (!bindings || !bindings.has(key)) return;
    const binding = bindings.get(key);
    el.removeEventListener(binding.type, binding.listener);
    bindings.delete(key);
  }
}

// Export a singleton instance for convenience, and the class itself.
const defaultManager = new EventManager();
export default defaultManager;
export { EventManager };
