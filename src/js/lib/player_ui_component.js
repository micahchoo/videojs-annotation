/*
    Base class all player UI components interit from - it includes lots of helper functions (to get reference to
    the player $el, various classes/helpers, template rendering, etc)
*/
const PlayerComponent = require('./player_component');
const { templates } = require('../templates');
const Utils = require('./utils');
const { qs, qsa, addClass, removeClass, attr } = require('./dom');

module.exports = class PlayerUIComponent extends PlayerComponent {
  // helpers to get various UI components of the player quickly, keeping commonly reused class names
  // consolidated in case of need to change in the future (and for quick access)
  get $UI() {
    if (this._$UICache) return this._$UICache;
    const playerEl = this.player.el();
    this._$UICache = Object.freeze({
      commentsContainer: qs(playerEl, '.vac-comments-container'), // outer container for all comments
      controlElements: qsa(playerEl, '.vac-control'), // Each of multiple control elements in the control bar
      newCommentTextarea: qs(playerEl, '.vac-video-write-new textarea'), // Textarea for writing a new comment
      timeline: qs(playerEl, '.vjs-progress-control'), // Timeline element
      markerCursorHelpText: qs(playerEl, '.vac-cursor-help-text'), // Help text that appears with 'click/drag..' on timeline
      controlBar: qs(playerEl, '.vjs-control-bar'), // Conrol bar wrapper for vjs
      markerWrap: qs(playerEl, '.vac-marker-wrap'), // wrapper element to place markers in on timeline
      coverCanvas: qs(playerEl, '.vac-video-cover-canvas') // Player cover during adding annotation state
    });
    return this._$UICache;
  }

  // Invalidate the cached $UI references (call after structural DOM changes)
  invalidateUICache() {
    this._$UICache = null;
  }

  // utility classes used in various components
  // eslint-disable-next-line class-methods-use-this
  get UI_CLASSES() {
    return Object.freeze({
      hidden: 'vac-hidden',
      active: 'vac-active'
    });
  }

  // attribute to get player element (previously jQuery object, now plain DOM for compatibility)
  get $player() {
    return this.player.el();
  }

  // attribute to get player id from DOM
  get playerId() {
    return attr(this.player.el(), 'id') || '';
  }

  // Generate a pseudo-guid ID for this component, to use as an ID in the DOM
  get componentId() {
    this.cid_ = this.cid_ || Utils.guid();
    return this.cid_;
  }

  // Disable play/control actions on the current player
  disablePlayingAndControl() {
    addClass(this.player.el(), 'vac-disable-play');
    // TODO - catch spacebar being hit
    // TODO - prevent scrubbing and timeline click to seek
  }

  // Enable play/control actions on the controller
  enablePlayingAndControl() {
    removeClass(this.player.el(), 'vac-disable-play');
  }

  // Render a template with local data passed in via key/val in object
  renderTemplate(templateName, options = {}) {
    return templates[templateName](options);
  }

  // Provide basic teardown function to inherit
  teardown() {
    if (this.el && this.el.parentNode) this.el.remove();
    this.invalidateUICache();
    super.teardown();
  }
};
