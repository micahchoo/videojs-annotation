/*
    Component for a shape that can be drug/sized on top of the video while adding a new annotation
*/

const Shape = require('./shape');
const Utils = require('./../lib/utils');
const { offset, innerWidth, innerHeight, addClass, removeClass, hasClass, qs } = require('../lib/dom');
const { sharedManager: eventManager } = require('../lib/events');

module.exports = class SelectableShape extends Shape {
  constructor(player) {
    super(player);
    this.parentEl = qs(this.player.el(), '.vac-video-cover-canvas');
    this.bindEvents();
    this.dragging = false;
  }

  // Bind all needed events for drag action
  bindEvents() {
    // On mousedown initialize drag
    eventManager.on(this.parentEl, 'mousedown.vac-selectable-shape', e => {
      // Check a few conditions to see if we should *not* start drag
      if (!hasClass(e.target, 'vac-video-cover-canvas')) return; // didn't click on overlay
      if (hasClass(e.target, 'vac-shape')) return; // user clicked on annotation

      // Remove old shape if one existed
      if (this.el) this.el.remove();

      // Define default starting shape (just x/y coords of where user clicked no width/height yet)
      const shape = {
        x1: this.xCoordToPercent(e.pageX),
        y1: this.YCoordToPercent(e.pageY)
      };
      shape.x2 = shape.x1;
      shape.y2 = shape.y1;
      this.shape = shape;

      // Save origin points for future use
      this.originX = shape.x1;
      this.originY = shape.y1;

      // Draw shape and start drag state
      this.render();
      this.dragging = true;
      this.dragMoved = false; // used to determine if user actually dragged or just clicked

      // Bind event on doc mousemove to track drag, throttled to once each 100ms
      eventManager.on(
        document,
        `mousemove.vac-sshape-${this.playerId}`,
        Utils.throttle(this.onDrag.bind(this), 100)
      );

      // Add drag class to cursor tooltip if available
      if (!this.plugin.options.showControls) {
        const tooltip = qs(this.player.el(), '.vac-cursor-tool-tip');
        if (tooltip) addClass(tooltip, 'vac-cursor-dragging');
      }
    });

    // On mouseup, if during drag cancel drag event listeners
    eventManager.on(document, `mouseup.vac-sshape-${this.playerId}`, e => {
      if (!this.dragging) return;

      eventManager.off(document, `mousemove.vac-sshape-${this.playerId}`);

      if (!this.dragMoved) {
        // clear shape if it's just a click (and not a drag)
        this.shape = null;
        if (this.el) this.el.remove();
      }

      this.dragging = false;

      // Remove drag class from cursor tooltip if available
      if (!this.plugin.options.showControls) {
        const tooltip = qs(this.player.el(), '.vac-cursor-tool-tip');
        if (tooltip) removeClass(tooltip, 'vac-cursor-dragging');
      }
    });
  }

  // On each interation of drag action (mouse movement), recalc position and redraw shape
  onDrag(e) {
    this.dragMoved = true;

    const xPer = this.xCoordToPercent(e.pageX);
    const yPer = this.YCoordToPercent(e.pageY);

    if (xPer < this.originX) {
      this.shape.x2 = this.originX;
      this.shape.x1 = Math.max(0, xPer);
    } else {
      this.shape.x2 = Math.min(100, xPer);
      this.shape.x1 = this.originX;
    }
    if (yPer < this.originY) {
      this.shape.y2 = this.originY;
      this.shape.y1 = Math.max(0, yPer);
    } else {
      this.shape.y2 = Math.min(100, yPer);
      this.shape.y1 = this.originY;
    }
    this.setDimsFromShape();

    this.plugin.fire('addingAnnotationDataChanged', { shape: this.shape });
  }

  // Convert pixel-based x position (relative to document) to percentage in video
  xCoordToPercent(x) {
    const rect = offset(this.parentEl);
    x -= rect.left; // pixel position
    const max = innerWidth(this.parentEl);
    return Number(((x / max) * 100).toFixed(2)); // round to 2 decimal places
  }

  // Convert pixel-based y position (relative to document) to percentage in video
  YCoordToPercent(y) {
    const rect = offset(this.parentEl);
    y -= rect.top; // pixel position
    const max = innerHeight(this.parentEl);
    return Number(((y / max) * 100).toFixed(2)); // round to 2 decimal places
  }

  // Unbind events and remove element
  teardown() {
    eventManager.off(this.parentEl, '.vac-selectable-shape');
    eventManager.off(document, `.vac-sshape-${this.playerId}`);
    super.teardown();
  }
};
