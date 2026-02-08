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
    // Array of all bindings: { el, type, namespace, selector, fn, listener }
    this._bindings = [];
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
              return;
            }
            target = target.parentElement;
          }
        }
      : fn;

    const binding = { el, type, namespace, selector, fn, listener };
    this._bindings.push(binding);
    el.addEventListener(type, listener);

    return () => this._removeSingle(binding);
  }

  /**
   * Remove event listeners matching criteria.
   * @param {Element} el
   * @param {string} [eventName] - e.g., 'click.vac-marker' or '.vac-marker' (any event in namespace) or empty for all
   */
  off(el, eventName = '') {
    if (!el) return;

    if (!eventName) {
      // Remove all events for this element
      this._removeMatching(b => b.el === el);
      return;
    }

    if (eventName.startsWith('.')) {
      // Remove all events in this namespace for this element
      const namespace = eventName.slice(1);
      this._removeMatching(b => b.el === el && b.namespace === namespace);
      return;
    }

    // Specific event+namespace
    const [type, namespace] = this._parseEventName(eventName);
    if (namespace) {
      this._removeMatching(b => b.el === el && b.type === type && b.namespace === namespace);
    } else {
      this._removeMatching(b => b.el === el && b.type === type);
    }
  }

  /**
   * Remove all events tracked by this manager.
   */
  offAll() {
    for (let i = this._bindings.length - 1; i >= 0; i--) {
      const b = this._bindings[i];
      b.el.removeEventListener(b.type, b.listener);
    }
    this._bindings.length = 0;
  }

  /**
   * Trigger an event on an element.
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

  _removeSingle(binding) {
    const idx = this._bindings.indexOf(binding);
    if (idx === -1) return;
    binding.el.removeEventListener(binding.type, binding.listener);
    this._bindings.splice(idx, 1);
  }

  _removeMatching(predicate) {
    for (let i = this._bindings.length - 1; i >= 0; i--) {
      const b = this._bindings[i];
      if (predicate(b)) {
        b.el.removeEventListener(b.type, b.listener);
        this._bindings.splice(i, 1);
      }
    }
  }
}

// Shared instance for components that need cross-component event unbinding
const sharedManager = new EventManager();

export default EventManager;
export { EventManager, sharedManager };
