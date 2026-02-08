/*
  Component for a list of comments in a visible/active annotation
*/

const PlayerUIComponent = require('./../lib/player_ui_component');
const Utils = require('./../lib/utils');
const Comment = require('./comment');
const { htmlToEl, addClass, removeClass, css, scrollTop, outerWidth, position, offset, innerWidth, innerHeight, qs, qsa, closest, append, before, remove, setHtml, getVal } = require('../lib/dom');
const { sharedManager: eventManager } = require('../lib/events');

const commentListTemplateName = 'comment_list';
const newCommentTemplateName = 'new_comment';

module.exports = class CommentList extends PlayerUIComponent {
  constructor(data, player) {
    super(player);

    this.annotation = data.annotation;
    this.comments = data.comments.map(commentData => {
      commentData.commentList = this;
      return new Comment(commentData, player);
    });
    this.sortComments();
  }

  // Serialize as W3C reply annotations
  get data() {
    return this.comments.map(c => c.data);
  }

  // Internal data for non-API use
  get _internalData() {
    return this.comments.map(c => c._internalData);
  }

  // Bind all events needed for the comment list
  bindListEvents() {
    eventManager.on(this.el, 'click.vac-comment', '.vac-close-comment-list', () => this.annotation.close());
    eventManager.on(this.el, 'click.vac-comment', '.vac-reply-btn', this.addNewComment.bind(this));
    eventManager.on(this.el, 'click.vac-comment', '.vac-delete-annotation', this.handleDeleteAnnotationClick.bind(this));
    eventManager.on(this.el, 'click.vac-comment', '.vac-delete-comment', this.destroyComment.bind(this));
    eventManager.on(this.el, 'click.vac-comment', '.vac-edit-annotation', this.handleEditAnnotationClick_.bind(this));
    eventManager.on(this.el, 'mousewheel.vac-comment', '.vac-comments-wrap', this.disablePageScroll.bind(this));
    eventManager.on(this.el, 'DOMMouseScroll.vac-comment', '.vac-comments-wrap', this.disablePageScroll.bind(this));
  }

  // Bind event listeners for new comments form
  bindCommentFormEvents() {
    if (!this.newCommentFormEl) return;
    eventManager.on(this.newCommentFormEl, 'click.vac-comment', '.vac-add-controls a, .vac-video-write-new.vac-is-comment a', this.closeNewComment.bind(this));
    eventManager.on(this.newCommentFormEl, 'click.vac-comment', '.vac-video-write-new.vac-is-comment button', this.saveNewComment.bind(this));
  }

  // Render CommentList UI with all comments using template
  render() {
    const userId = this.plugin.meta.user_id;
    const ownerId = this.comments[0] && this.comments[0].meta.user_id;
    const isOwner = userId && ownerId && userId === ownerId;
    const allowEdit = this.plugin.options.allowEdit && (!this.plugin.options.restrictEditToOwner || isOwner);
    const allowDelete = this.plugin.options.allowDelete && (!this.plugin.options.restrictDeleteToOwner || isOwner);

    const html = this.renderTemplate(commentListTemplateName, {
      commentsHTML: this.comments.map(c => Utils.sanitizeCommentHTML(c.HTML)),
      rangeStr: this.plugin.options.frameRate
        ? Utils.humanTimeFrames(this.annotation.range, this.plugin.options.frameRate)
        : Utils.humanTime(this.annotation.range),
      allowEdit,
      allowDelete
    });
    this.el = htmlToEl(html, true);
    append(this.player.el(), this.el);
    this.invalidateUICache();
    this.wrapEl = this.$UI.commentsContainer;
    this.bindListEvents();
  }

  // Re-render UI on state change
  reRender() {
    this.teardown(false);
    this.render();
  }

  // Render new comment form
  addNewComment() {
    addClass(this.wrapEl, this.UI_CLASSES.active);
    const commentsWrap = qs(this.wrapEl, '.vac-comments-wrap');
    if (commentsWrap) scrollTop(commentsWrap, 999999);
    const shapebox = qs(this.wrapEl, '.vac-add-new-shapebox');
    const width = outerWidth(shapebox);
    const pos = position(shapebox);
    const top = pos.top + 10;
    const right = outerWidth(this.wrapEl) - (pos.left + width);

    const formHtml = this.renderTemplate(newCommentTemplateName, { width, top, right });
    this.newCommentFormEl = htmlToEl(formHtml, true);
    this.bindCommentFormEvents();
    append(this.player.el(), this.newCommentFormEl);
  }

  // Save comment from new comment form, update state and re-render UI
  saveNewComment() {
    removeClass(this.wrapEl, this.UI_CLASSES.active);

    const user_id = 1;
    const body = getVal(this.$UI.newCommentTextarea);

    if (!body) return; // empty comment - TODO add validation / err message
    this.createComment(body);
  }

  createComment(body) {
    const comment = Comment.newFromData(body, this, this.plugin);
    this.comments.push(comment);
    this.sortComments();

    // Don't mutate UI if comment is being created for an inactive annotation (via API)
    if (this.annotation.isActive) {
      this.appendComment(comment);
      this.closeNewComment();
    }

    this.plugin.annotationState.stateChanged(true);
    this.plugin.fire('commentAdded', { annotationId: this.annotation.id, comment: comment.data });
  }

  // Append a single comment to the list without full re-render
  appendComment(comment) {
    if (!this.el) return this.reRender(false);
    const sanitizedHTML = Utils.sanitizeCommentHTML(comment.HTML);
    const commentEl = htmlToEl(sanitizedHTML, true);
    const replyBtn = qs(this.el, '.vac-reply-btn');
    if (replyBtn) before(commentEl, replyBtn);
  }

  // Cancel comment adding process
  closeNewComment() {
    this.unbindCommentFormEvents();
    if (this.wrapEl) removeClass(this.wrapEl, this.UI_CLASSES.active);
    if (this.newCommentFormEl) remove(this.newCommentFormEl);
    this.newCommentFormEl = null;
    this.$newCommentForm = null;
  }

  // Delete a comment. If it is the only comment, delete the annotation
  // Update state and re-render UI
  destroyComment(event) {
    const annotationId = this.annotation.id;
    if (this.comments.length == 1) {
      this.annotation.teardown();
    } else {
      const commentId = this.findCommentId(event);
      const comment = this.comments.find(c => c.id == commentId);
      const i = this.comments.indexOf(comment);
      this.comments.splice(i, 1);
      this.reRender();
      this.plugin.fire('commentDeleted', { annotationId, commentId });
    }

    this.plugin.annotationState.stateChanged(true);
  }

  findCommentId(event) {
    if (typeof event.detail.id !== 'undefined') return event.detail.id;
    const target = event.target;
    const commentEl = closest(target, '.vac-comment');
    return commentEl ? commentEl.getAttribute('data-id') : null;
  }

  // Prevents outer page scroll when at the top or bottom of CommentList UI
  // TODO: This might need to be fine-tuned?
  disablePageScroll(event) {
    const target = event.currentTarget;
    const height = target.offsetHeight;
    const ogEvent = event;
    const delta = ogEvent.wheelDelta || -ogEvent.detail;
    const dir = delta < 0 ? 'down' : 'up';
    const scrollDiff = Math.abs(target.scrollHeight - target.clientHeight);

    // if scrolling into top of div
    if (target.scrollTop < 20 && dir == 'up') {
      target.scrollTo({ top: 0, behavior: 'smooth' });
      event.preventDefault();
    }

    // if scrolling into bottom of div
    if (target.scrollTop > scrollDiff - 10 && dir == 'down') {
      target.scrollTo({ top: height + 40, behavior: 'smooth' });
      event.preventDefault();
    }
  }

  // Sort comments by timestamp
  sortComments() {
    this.comments.sort((a, b) => {
      return a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0;
    });
  }

  // Edit the annotation (start edit flow)
  handleEditAnnotationClick_() {
    this.plugin.controls.startEdit(this.annotation);
  }

  // Delete the annotation
  handleDeleteAnnotationClick(e) {
    const confirmEl = document.createElement('a');
    confirmEl.className = 'vac-delete-confirm';
    confirmEl.textContent = 'CONFIRM';
    eventManager.on(confirmEl, 'click.comment', () => {
      eventManager.off(confirmEl, '.comment');
      this.annotation.teardown();
    });
    e.target.replaceWith(confirmEl);
  }

  // Unbind listeners for new comments form
  unbindCommentFormEvents() {
    if (this.newCommentFormEl) eventManager.off(this.newCommentFormEl, '.vac-comment');
  }

  // Teardown CommentList UI, unbind events
  teardown(destroyComments = true) {
    this.closeNewComment();
    if (this.el) {
      eventManager.off(this.el, '.vac-comment');
    }
    this.comments.forEach(c => c.teardown(destroyComments));
    if (destroyComments) this.comments = [];
    super.teardown();
  }
};
