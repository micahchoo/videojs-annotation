/*
    Component main 'annotation toggle' button in the player controls, including notifier for # annotations
*/

const PlayerUIComponent = require('../lib/player_ui_component');
const { addClass, qs, qsa, setHtml, setText, hasClass, removeClass } = require('../lib/dom');
const { sharedManager: eventManager } = require('../lib/events');

const templateName = 'player_button';

module.exports = class PlayerButton extends PlayerUIComponent {
  constructor(player) {
    super(player);
    this.render();

    this.initAPI(this, 'PlayerButton');

    eventManager.on(this.el, 'click.vac-player-button', () => {
      this.plugin.toggleAnnotationMode();
    });
  }

  // Add button to player
  render() {
    const btn = this.player.getChild('controlBar').addChild('button', {});
    btn.controlText('Toggle Animations');
    this.el = btn.el();
    this.$el = this.el; // keep reference for compatibility
    addClass(this.el, 'vac-player-btn');
    const icon = qs(this.el, '.vjs-icon-placeholder');
    if (icon) setHtml(icon, this.renderTemplate(templateName));
  }

  // Update the number of annotations displayed in the bubble
  updateNumAnnotations() {
    const num = this.plugin.annotationState.annotations.length;
    const bubble = qs(this.el, 'b');
    if (!bubble) return;
    setText(bubble, num.toString());
    if (num > 0) {
      removeClass(bubble, this.UI_CLASSES.hidden);
    } else {
      addClass(bubble, this.UI_CLASSES.hidden);
    }
  }

  // Unbind event listeners on teardown and remove DOM nodes
  teardown() {
    eventManager.off(this.el, '.vac-player-button');
    super.teardown();
  }
};
