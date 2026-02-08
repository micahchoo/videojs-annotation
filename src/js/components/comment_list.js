/*
  Component for a list of comments in a visible/active annotation
*/

const PlayerUIComponent = require('./../lib/player_ui_component');
const Utils = require('./../lib/utils');
const Comment = require('./comment');

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

  // Serialize object
  get data() {
    return this.comments.map(c => c.data);
  }

  // Bind all events needed for the comment list
  bindListEvents() {
    this.$el
      .on('click.vac-comment', '.vac-close-comment-list', () => this.annotation.close()) // Hide CommentList UI with close button
      .on('click.vac-comment', '.vac-reply-btn', this.addNewComment.bind(this)) // Open new reply UI with reply button
      .on(
        'click.vac-comment',
        '.vac-delete-annotation',
        this.handleDeleteAnnotationClick.bind(this)
      ) // Delete annotation with main delete button
      .on('click.vac-comment', '.vac-delete-comment', this.destroyComment.bind(this)) // Delete comment with delete comment button
      .on('click.vac-comment', '.vac-edit-annotation', this.handleEditAnnotationClick_.bind(this)) // Edit annotation
      .on(
        'mousewheel.vac-comment DOMMouseScroll.vac-comment',
        '.vac-comments-wrap',
        this.disablePageScroll.bind(this)
      ); // Prevent outer page scroll when scrolling inside of the CommentList UI
  }

  // Bind event listeners for new comments form
  bindCommentFormEvents() {
    this.$newCommentForm
      .on(
        'click.vac-comment',
        '.vac-add-controls a, .vac-video-write-new.vac-is-comment a',
        this.closeNewComment.bind(this)
      ) // Cancel new comment creation with cancel link
      .on(
        'click.vac-comment',
        '.vac-video-write-new.vac-is-comment button',
        this.saveNewComment.bind(this)
      ); // Save new comment with save button
  }

  // Render CommentList UI with all comments using template
  render() {
    const userId = this.plugin.meta.user_id;
    const ownerId = this.comments[0] && this.comments[0].meta.user_id;
    const isOwner = userId && ownerId && userId === ownerId;
    const allowEdit = this.plugin.options.allowEdit && (!this.plugin.options.restrictEditToOwner || isOwner);
    const allowDelete = this.plugin.options.allowDelete && (!this.plugin.options.restrictDeleteToOwner || isOwner);

    this.$el = $(
      this.renderTemplate(commentListTemplateName, {
        commentsHTML: this.comments.map(c => Utils.sanitizeCommentHTML(c.HTML)),
        rangeStr: this.plugin.options.frameRate
          ? Utils.humanTimeFrames(this.annotation.range, this.plugin.options.frameRate)
          : Utils.humanTime(this.annotation.range),
        allowEdit,
        allowDelete
      })
    );

    this.$player.append(this.$el);
    this.invalidateUICache();
    this.$wrap = this.$UI.commentsContainer;
    this.bindListEvents();
  }

  // Re-render UI on state change
  reRender() {
    this.teardown(false);
    this.render();
  }

  // Render new comment form
  addNewComment() {
    this.$wrap
      .addClass(this.UI_CLASSES.active)
      .find('.vac-comments-wrap')
      .scrollTop(999999);
    const $shapebox = this.$wrap.find('.vac-add-new-shapebox');
    const width = $shapebox.outerWidth();
    const top = $shapebox.position().top + 10;
    const right = this.$wrap.outerWidth() - ($shapebox.position().left + width);

    this.$newCommentForm = $(this.renderTemplate(newCommentTemplateName, { width, top, right }));
    this.bindCommentFormEvents();
    this.$player.append(this.$newCommentForm);
  }

  // Save comment from new comment form, update state and re-render UI
  saveNewComment() {
    this.$wrap.removeClass(this.UI_CLASSES.active);

    const user_id = 1;
    const body = this.$UI.newCommentTextarea.val();

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
    if (!this.$el) return this.reRender(false);
    const sanitizedHTML = Utils.sanitizeCommentHTML(comment.HTML);
    const $comment = $(sanitizedHTML);
    this.$el.find('.vac-reply-btn').before($comment);
  }

  // Cancel comment adding process
  closeNewComment() {
    this.unbindCommentFormEvents();
    if (this.$wrap) this.$wrap.removeClass(this.UI_CLASSES.active);
    if (this.$newCommentForm) this.$newCommentForm.remove();
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
    const id =
      typeof event.detail.id === 'undefined'
        ? $(event.target)
            .closest('.vac-comment')
            .data('id')
        : event.detail.id;
    return id;
  }

  // Prevents outer page scroll when at the top or bottom of CommentList UI
  // TODO: This might need to be fine-tuned?
  disablePageScroll(event) {
    const $target = $(event.currentTarget);
    const height = $target.height();
    const ogEvent = event.originalEvent;
    const delta = ogEvent.wheelDelta || -ogEvent.detail;
    const dir = delta < 0 ? 'down' : 'up';
    const scrollDiff = Math.abs(
      event.currentTarget.scrollHeight - event.currentTarget.clientHeight
    );

    // if scrolling into top of div
    if ($target.scrollTop() < 20 && dir == 'up') {
      event.currentTarget.scrollTo({ top: 0, behavior: 'smooth' });
      event.preventDefault();
    }

    // if scrolling into bottom of div
    if ($target.scrollTop() > scrollDiff - 10 && dir == 'down') {
      event.currentTarget.scrollTo({ top: height + 40, behavior: 'smooth' });
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
    const $confirmEl = $('<a/>')
      .addClass('vac-delete-confirm')
      .text('CONFIRM');
    $confirmEl.on('click.comment', () => {
      $confirmEl.off('click.comment');
      this.annotation.teardown();
    });
    $(e.target).replaceWith($confirmEl);
  }

  // Unbind listeners for new comments form
  unbindCommentFormEvents() {
    if (this.$newCommentForm) this.$newCommentForm.off('click.vac-comment');
  }

  // Teardown CommentList UI, unbind events
  teardown(destroyComments = true) {
    this.closeNewComment();
    if (this.$el) {
      this.$el.off('click.vac-comment mousewheel.vac-comment DOMMouseScroll.vac-comment');
    }
    this.comments.forEach(c => c.teardown(destroyComments));
    if (destroyComments) this.comments = [];
    super.teardown();
  }
};
