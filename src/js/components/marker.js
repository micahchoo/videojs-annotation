/*
    Component for a timeline marker with capabilities to render on timeline, including tooltip for comment
*/

const PlayerUIComponent = require('../lib/player_ui_component');
const Utils = require('../lib/utils');
const { htmlToEl, addClass, removeClass, closest, append } = require('../lib/dom');
const { sharedManager: eventManager } = require('../lib/events');

const markerTemplateName = 'marker';
const markerWrapTemplateName = 'marker_wrap';

module.exports = class Marker extends PlayerUIComponent {
  constructor(player, range, comment = null, markerClass = null, annotationType = null) {
    super(player);
    this.range = range;
    this.comment = comment;
    this.markerClass = markerClass;
    this.annotationType = annotationType;
    this.templateName = markerTemplateName;

    if (!this.$UI.markerWrap) {
      const wrapEl = htmlToEl(this.renderTemplate(markerWrapTemplateName), true);
      this.$UI.timeline.appendChild(wrapEl);
      this.invalidateUICache();
    }
  }

  // Set this marker as active (highlight) and optionally show tooltip also
  setActive(showTooltip = false) {
    addClass(this.el, this.UI_CLASSES.active);
    if (showTooltip) addClass(this.el, 'vac-force-tooltip');
  }

  // Deactivate this marker
  deactivate() {
    removeClass(this.el, this.UI_CLASSES.active);
    removeClass(this.el, 'vac-force-tooltip');
  }

  // Draw marker on timeline for this.range;
  render() {
    // clear existing marker if this one was already rendered
    const existing = this.$UI.timeline.querySelector(`[data-marker-id="${this.componentId}"]`);
    if (existing) existing.remove();

    // Bind to local instance var, add to DOM, and setup events
    this.el = htmlToEl(this.renderTemplate(this.templateName, this.markerTemplateData), true);
    this.$el = this.el; // keep reference for compatibility (plain element)
    append(this.$UI.markerWrap, this.el);
    this.bindMarkerEvents();
  }

  // Bind needed events for this marker
  bindMarkerEvents() {
    // handle dimming other markers + highlighting this one on mouseenter/leave
    eventManager.on(this.el, 'mouseenter.vac-marker', () => {
      addClass(this.el, 'vac-hovering');
      const wrap = closest(this.el, '.vac-marker-wrap');
      if (wrap) addClass(wrap, 'vac-dim-all');
    });
    eventManager.on(this.el, 'mouseleave.vac-marker', () => {
      removeClass(this.el, 'vac-hovering');
      const wrap = closest(this.el, '.vac-marker-wrap');
      if (wrap) removeClass(wrap, 'vac-dim-all');
    });
  }

  // Build object for template
  get markerTemplateData() {
    // the smaller the width, the higher the z-index so overlaps are clickable
    const left = (this.range.start / this.duration) * 100;
    const width = (this.range.end / this.duration) * 100 - left;
    const zIndex = 100 - Math.floor(width) || 100;
    return {
      left: `${left}%`,
      width: `${width}%`,
      zIndex,
      showTooltip: this.plugin.options.showMarkerShapeAndTooltips,
      tooltipRight: left > 50,
      tooltipTime: this.plugin.options.frameRate
        ? Utils.humanTimeFrames(this.range, this.plugin.options.frameRate)
        : Utils.humanTime(this.range),
      tooltipBody: !this.comment ? null : this.comment.body,
      rangeShow: !!this.range.end,
      id: this.componentId,
      markerClass: Utils.sanitizeCSSClassName(this.markerClass),
      annotationType: Utils.sanitizeCSSClassName(this.annotationType) || 'default'
    };
  }

  // Unbind event listeners on teardown and remove DOM nodes
  teardown() {
    eventManager.off(this.el, '.vac-marker');
    super.teardown();
  }
};
