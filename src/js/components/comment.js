/*
  Component for an invidual comment
*/

const PlayerUIComponent = require('./../lib/player_ui_component');
const Utils = require('./../lib/utils');
const { htmlToEl } = require('../lib/dom');

const templateName = 'comment';

module.exports = class Comment extends PlayerUIComponent {
  constructor(data, player) {
    super(player);
    this.commentList = data.commentList;
    this.id = data.id || this.componentId;
    this.meta = data.meta;
    this.body = data.body;
    this.timestamp = Math.floor(new Date(data.meta.datetime).getTime() / 1000);
    this.timeSince = this.timeSince();

    this.el = htmlToEl(this.render());
  }

  // Serialize as W3C reply annotation
  get data() {
    return {
      type: 'Annotation',
      motivation: 'replying',
      body: { type: 'TextualBody', value: this.body, format: 'text/plain' },
      creator: {
        type: 'Person',
        name: this.meta.user_name,
        ...(this.meta.user_id != null ? { id: String(this.meta.user_id) } : {})
      },
      created: this.meta.datetime
    };
  }

  // Internal data for non-API use
  get _internalData() {
    return { id: this.id, meta: this.meta, body: this.body };
  }

  get HTML() {
    return this.el.outerHTML;
  }

  render() {
    return this.renderTemplate(templateName, {
      id: this.id,
      body: this.body,
      meta: this.meta,
      timeSince: this.timeSince
    });
  }

  // Return time since comment timestamp
  timeSince() {
    return Utils.timeAgo(this.meta.datetime);
  }

  teardown(destroy = false) {
    super.teardown(destroy);
  }

  // Return a Comment obj given body content and plugin reference
  static newFromData(body, commentList, plugin) {
    const data = this.dataObj(body, plugin);
    data.commentList = commentList;
    return new Comment(data, plugin.player);
  }

  // Return an object with plugin data, timestamp, unique id, and body content
  static dataObj(body, plugin) {
    return {
      meta: { datetime: new Date().toISOString(), ...plugin.meta },
      id: Utils.guid(),
      body
    };
  }
};
