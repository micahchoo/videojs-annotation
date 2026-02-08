/*
    Component for a timeline marker that is draggable when user clicks/drags on it, and rebuilds underlying range
    as drag occurs
*/

const Marker = require('./marker');
const Utils = require('../lib/utils');
const { offset, innerWidth, addClass, removeClass, qs } = require('../lib/dom');
const { sharedManager: eventManager } = require('../lib/events');

const markerTemplateName = 'draggable_marker';

module.exports = class DraggableMarker extends Marker {
  constructor(player, range) {
    super(player, range);
    this.range = range; // NOTE - this shouldn't be required and is a HACK for how transpilation works in IE10
    this.templateName = markerTemplateName; // Change template from base Marker template
    this.dragging = false; // Is a drag action currently occring?
    this.rangePin = range.start; // What's the original pinned timeline point when marker was added
    this.render();
    this.parentEl = this.$UI.markerWrap; // Set parent as marker wrap (raw element)
  }

  // Bind needed events for UI interaction
  bindMarkerEvents() {
    // On mouse down init drag
    eventManager.on(this.el, 'mousedown.vac-marker', e => {
      e.preventDefault();
      this.dragging = true;
      // When mouse moves (with mouse down) call onDrag, throttling to once each 250 ms
      eventManager.on(
        document,
        `mousemove.vac-dmarker-${this.playerId}`,
        Utils.throttle(this.onDrag.bind(this), 250)
      );

      // Add drag class to cursor tooltip if available
      if (!this.plugin.options.showControls) {
        const tooltip = qs(this.player.el(), '.vac-cursor-tool-tip');
        if (tooltip) {
          addClass(tooltip, 'vac-cursor-dragging');
          removeClass(tooltip, 'vac-marker-hover');
        }
      }
    });

    // On mouse up end drag action and unbind mousemove event
    eventManager.on(document, `mouseup.vac-dmarker-${this.playerId}`, e => {
      if (!this.dragging) return;
      eventManager.off(document, `mousemove.vac-dmarker-${this.playerId}`);
      this.dragging = false;

      // Remove drag class and hover class from cursor tooltip if available
      if (!this.plugin.options.showControls) {
        const tooltip = qs(this.player.el(), '.vac-cursor-tool-tip');
        if (tooltip) {
          removeClass(tooltip, 'vac-cursor-dragging');
          removeClass(tooltip, 'vac-marker-hover');
        }
      }
    });

    // On mouse enter, show cursor tooltip if controls are not shown
    // This adds the class which is picked up in Controls
    if (!this.plugin.options.showControls) {
      eventManager.on(this.el, 'mouseenter.vac-cursor-tool-tip', () => {
        const tooltip = qs(this.player.el(), '.vac-cursor-tool-tip');
        if (tooltip) addClass(tooltip, 'vac-marker-hover');
      });
      eventManager.on(this.el, 'mouseleave.vac-cursor-tool-tip', () => {
        const tooltip = qs(this.player.el(), '.vac-cursor-tool-tip');
        if (tooltip) removeClass(tooltip, 'vac-marker-hover');
      });
    }
  }

  // On drag action, calculate new range and re-render marker
  onDrag(e) {
    const dragPercent = this.percentValFromXpos(e.pageX);
    const frameRate = this.plugin.options.frameRate;
    let secVal;
    if (frameRate) {
      const rawSec = this.duration * dragPercent;
      const frame = Math.round(rawSec * frameRate);
      secVal = frame / frameRate;
    } else {
      secVal = parseInt(this.duration * dragPercent);
    }

    if (secVal > this.rangePin) {
      this.range = {
        start: this.rangePin,
        end: secVal
      };
    } else {
      this.range = {
        start: secVal,
        end: this.rangePin
      };
    }
    this.render();
    this.plugin.fire('addingAnnotationDataChanged', { range: this.range });
  }

  // Calculate percentage (of video) position for a pixel-based X position on the document
  percentValFromXpos(xpos) {
    const rect = offset(this.parentEl);
    const max = innerWidth(this.parentEl);
    const x = Math.max(0, xpos - rect.left); // px val
    let per = x / max;
    if (per > 1) per = 1;
    if (per < 0) per = 0;
    return per;
  }

  // Remove bound events on destruction
  teardown() {
    eventManager.off(document, `.vac-dmarker-${this.playerId}`);
    eventManager.off(this.el, '.vac-cursor-tool-tip');
    eventManager.off(this.el, 'mousedown.vac-marker');
    super.teardown();
  }

  // Move the video & marker start by some amount (pos or neg)
  // unit: 'second' (default) or 'frame'
  scrubStart(amount, unit = 'second') {
    const frameRate = this.plugin.options.frameRate;
    let delta;
    if (unit === 'frame' && frameRate) {
      delta = amount / frameRate;
    } else {
      delta = amount;
    }
    const newStart = this.range.start + delta;
    this.currentTime = newStart;
    this.range.start = newStart;
    this.rangePin = newStart;
    this.teardown();
    this.render();

    this.plugin.fire('addingAnnotationDataChanged', { range: this.range });
  }
};
