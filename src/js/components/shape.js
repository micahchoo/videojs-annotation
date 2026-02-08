/*
    Component for managing a shape (i.e. box drawn on the player) for an annotation
*/

const PlayerUIComponent = require('./../lib/player_ui_component');
const Utils = require('./../lib/utils');
const { createElement, addClass, css, append, remove } = require('../lib/dom');

module.exports = class Shape extends PlayerUIComponent {
  constructor(player, shape = null) {
    super(player);
    this.shape = shape;
    this.parentEl = this.player.el();
  }

  // Draw the shape element on the parent
  render() {
    if (!this.shape) return;
    if (this.el) remove(this.el);

    this.el = createElement('div', 'vac-shape');
    this.setDimsFromShape();
    append(this.parentEl, this.el);
  }

  // Set/update the dimensions of the shape based on this.shape
  setDimsFromShape() {
    const x1 = Utils.clampNumber(this.shape.x1, 0, 100);
    const y1 = Utils.clampNumber(this.shape.y1, 0, 100);
    const x2 = Utils.clampNumber(this.shape.x2, 0, 100);
    const y2 = Utils.clampNumber(this.shape.y2, 0, 100);
    css(this.el, {
      left: `${x1}%`,
      top: `${y1}%`,
      width: `${x2 - x1}%`,
      height: `${y2 - y1}%`
    });
  }
};
