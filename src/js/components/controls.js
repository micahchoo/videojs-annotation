/*
    Component for managing annotation "control box" in upper left of video when in annotation mode,
    including all functionality to add new annotations
*/

const PlayerUIComponent = require('./../lib/player_ui_component');
const Utils = require('./../lib/utils');
const DraggableMarker = require('./draggable_marker.js');
const SelectableShape = require('./selectable_shape.js');
const PlayerButton = require('./player_button');
const Annotation = require('./annotation');
const { qs, qsa, addClass, removeClass, hasClass, css, width, height, append, remove, getVal, setText, htmlToEl } = require('../lib/dom');
const { EventManager } = require('../lib/events');

const templateName = 'controls';

// Control uses a "ui state" to determine how UI is rendered - this object is the base state, containing a
// default value for each item in the state
const BASE_UI_STATE = Object.freeze({
  adding: false, // Are we currently adding a new annotation? (step 1 of flow)
  writingComment: false, // Are we currently writing the comment for annotation (step 2 of flow)
  editing: false // Are we currently editing an existing annotation's range/shape?
});

module.exports = class Controls extends PlayerUIComponent {
  constructor(player, bindArrowKeys) {
    super(player);
    this.initAPI(this, 'Controls');

    this.internalCommenting = this.plugin.options.internalCommenting;
    this.showControls = this.plugin.options.showControls;
    this.uiState = Utils.cloneObject(BASE_UI_STATE);
    this.eventManager = new EventManager();
    this.bindEvents(bindArrowKeys);

    if (this.showControls) {
      // create player button in the control bar if controls are shown
      this.playerButton = new PlayerButton(this.player);
    }

    this.render();
  }

  // Bind all the events we need for UI interaction
  bindEvents(bindArrowKeys) {
    const playerEl = this.player.el();
    this.eventManager.on(playerEl, 'click.vac-controls', '.vac-controls button', this.startAddNew.bind(this)); // Add new button click
    this.eventManager.on(playerEl, 'click.vac-controls', '.vac-annotation-nav .vac-a-next', () =>
      this.plugin.annotationState.nextAnnotation()
    ); // Click 'next' on annotation nav
    this.eventManager.on(playerEl, 'click.vac-controls', '.vac-annotation-nav .vac-a-prev', () =>
      this.plugin.annotationState.prevAnnotation()
    ); // Click 'prev' on annotation nav
    this.eventManager.on(playerEl, 'click.vac-controls', '.vac-video-move .vac-a-next', () => this.marker && this.marker.scrubStart(1)); // Click '+1 sec' on marker nav
    this.eventManager.on(playerEl, 'click.vac-controls', '.vac-video-move .vac-a-prev', () => this.marker && this.marker.scrubStart(-1)); // Click '-1 sec' on marker nav
    this.eventManager.on(playerEl, 'click.vac-controls', '.vac-frame-move .vac-f-next', () => this.marker && this.marker.scrubStart(1, 'frame')); // Click '+1 frame' on frame nav
    this.eventManager.on(playerEl, 'click.vac-controls', '.vac-frame-move .vac-f-prev', () => this.marker && this.marker.scrubStart(-1, 'frame')); // Click '-1 frame' on frame nav

    if (this.internalCommenting) {
      this.eventManager.on(playerEl, 'click.vac-controls', '.vac-add-controls:not(.vac-edit-controls) button', this.writeComment.bind(this)); // 'Next' button click while adding
      this.eventManager.on(
        playerEl,
        'click.vac-controls',
        '.vac-video-write-new.vac-is-annotation button',
        this.saveNew.bind(this)
      ); // 'Save' button click while adding
      this.eventManager.on(
        playerEl,
        'click.vac-controls',
        '.vac-add-controls:not(.vac-edit-controls) a, .vac-video-write-new.vac-is-annotation a',
        this.cancelAddNew.bind(this)
      ); // Cancel link click
      this.eventManager.on(playerEl, 'click.vac-controls', '.vac-edit-controls .vac-save-edit', this.saveEdit.bind(this));
      this.eventManager.on(playerEl, 'click.vac-controls', '.vac-edit-controls .vac-cancel-edit', this.cancelEdit.bind(this));
    }
    if (bindArrowKeys) {
      this.eventManager.on(document, `keyup.vac-nav-${this.playerId}`, this.handleArrowKeys.bind(this)); // Use arrow keys to navigate annotations
    }
  }

  // Remove UI and unbind events for this and child components
  teardown() {
    this.clear(true);
    const playerEl = this.player.el();
    this.eventManager.off(playerEl, '.vac-controls');
    this.eventManager.off(document, `.vac-nav-${this.playerId}`);
    this.eventManager.off(document, `.vac-tooltip-${this.playerId}`);
    if (this.playerButton) this.playerButton.teardown();
    this.eventManager.offAll();
    super.teardown();
  }

  // Clear existing UI (resetting components if need be)
  clear(reset = false) {
    if (reset) {
      if (this.uiState.adding) {
        this.restoreNormalUI();
        this.marker.teardown();
        this.selectableShape.teardown();
      }
      if (this.uiState.editing) {
        this.restoreNormalUI();
        this.marker.teardown();
        this.selectableShape.teardown();
        if (this.editingAnnotation) {
          css(this.editingAnnotation.marker.el, { display: '' });
          this.editingAnnotation = null;
        }
      }
      this.uiState = Utils.cloneObject(BASE_UI_STATE);
      const canvasEl = qs(this.player.el(), '.vac-video-cover-canvas');
      if (canvasEl) {
        this.eventManager.off(canvasEl, 'mousedown.vac-cursor-tooltip');
        this.eventManager.off(canvasEl, 'mouseup.vac-cursor-tooltip');
      }
    }
    this.$tooltip_ = null;
    // Remove each control element
    const controlEls = qsa(this.player.el(), '.vac-control');
    controlEls.forEach(el => remove(el));
  }

  // Render the UI elements (based on uiState)
  render(reset = false) {
    this.clear(reset);
    const data = {
      rangeStr: this.marker
        ? (this.plugin.options.frameRate
          ? Utils.humanTimeFrames(this.marker.range, this.plugin.options.frameRate)
          : Utils.humanTime(this.marker.range))
        : null,
      showNav: this.plugin.annotationState.annotations.length > 1,
      ...this.uiState,
      internalCommenting: this.internalCommenting,
      showControls: this.showControls,
      allowAdd: this.plugin.options.allowAdd,
      frameRate: this.plugin.options.frameRate
    };

    const $ctrls = this.renderTemplate(templateName, data);
    const fragment = htmlToEl($ctrls, false);
    this.player.el().appendChild(fragment);
    this.invalidateUICache();

    if (this.playerButton) this.playerButton.updateNumAnnotations();
  }

  // User clicked to cancel in-progress add - restore to normal state
  cancelAddNew() {
    if (this.uiState.editing) return;
    if (!(this.uiState.adding || this.uiState.writingComment)) return;
    this.render(true);
    this.marker.teardown();
    this.marker = null;
  }

  // User clicked 'add' button in the controls - setup UI and marker
  startAddNew() {
    if (!this.plugin.active) this.plugin.toggleAnnotationMode();

    this.player.pause();
    this.setAddingUI();
    this.uiState.adding = true;
    this.render();

    // construct new range and create marker
    const frameRate = this.plugin.options.frameRate;
    let startTime;
    if (frameRate) {
      const frame = Math.round(this.currentTime * frameRate);
      startTime = frame / frameRate;
    } else {
      startTime = parseInt(this.currentTime, 10);
    }
    const range = {
      start: startTime,
      stop: startTime
    };
    this.marker = new DraggableMarker(this.player, range);
    this.selectableShape = new SelectableShape(this.player);

    // show cursor help text if controls are hidden
    if (!this.showControls) this.bindCursorTooltip();

    this.plugin.fire('enteredAddingAnnotation', { range });
  }

  // User clicked 'next' action - show UI to write comment
  writeComment() {
    this.uiState.writingComment = true;
    this.render();
  }

  // User clicked to save a new annotation/comment during add new flow
  saveNew() {
    const comment = getVal(this.$UI.newCommentTextarea);
    if (!comment) return; // empty comment - TODO add validation / err message

    const a = Annotation.newFromData(
      this.marker.range,
      this.selectableShape.shape,
      comment,
      this.plugin
    );
    this.plugin.annotationState.addNewAnnotation(a);

    this.cancelAddNew();
  }

  // Start editing an existing annotation's range/shape
  startEdit(annotation) {
    if (!this.plugin.active) this.plugin.toggleAnnotationMode();

    this.player.pause();
    this.editingAnnotation = annotation;
    this.editOriginalRange = Utils.cloneObject(annotation.range);
    this.editOriginalShape = annotation.shape ? Utils.cloneObject(annotation.shape) : null;

    // Close annotation UI but keep reference
    annotation.close(true);
    css(annotation.marker.el, { display: 'none' });

    this.setAddingUI();
    this.uiState.editing = true;
    this.render();

    // Create draggable marker with existing range
    const range = Utils.cloneObject(annotation.range);
    this.marker = new DraggableMarker(this.player, range);
    this.selectableShape = new SelectableShape(this.player, annotation.shape);

    if (!this.showControls) this.bindCursorTooltip();
  }

  // Save edits to the annotation
  saveEdit() {
    const annotation = this.editingAnnotation;
    annotation.range = Utils.cloneObject(this.marker.range);
    if (this.selectableShape.shape) {
      annotation.shape = Utils.cloneObject(this.selectableShape.shape);
    }
    annotation.secondsActive = annotation.buildSecondsActiveArray();

    // Rebuild marker
    annotation.marker.teardown();
    annotation.buildMarker();
    annotation.bindEvents();

    // Teardown editing UI
    this.marker.teardown();
    this.selectableShape.teardown();
    this.editingAnnotation = null;
    this.uiState.editing = false;
    this.restoreNormalUI();
    this.render(false);
    this.marker = null;

    this.plugin.annotationState.stateChanged();
    this.plugin.fire('annotationEdited', { id: annotation.id, annotation: annotation.data });
  }

  // Cancel editing, restore original range/shape
  cancelEdit() {
    const annotation = this.editingAnnotation;
    annotation.range = this.editOriginalRange;
    annotation.shape = this.editOriginalShape;

    // Teardown editing UI
    this.marker.teardown();
    this.selectableShape.teardown();
    css(annotation.marker.el, { display: '' });
    this.editingAnnotation = null;
    this.uiState.editing = false;
    this.restoreNormalUI();
    this.render(false);
    this.marker = null;
  }

  // Change normal UI (hide markers, hide playback, etc) on init add state
  setAddingUI() {
    this.plugin.annotationState.enabled = false;
    this.disablePlayingAndControl();
  }

  // Restore normal UI after add state
  restoreNormalUI() {
    this.plugin.annotationState.enabled = this.plugin.active;
    this.enablePlayingAndControl();
    this.eventManager.off(document, `mousemove.vac-tooltip-${this.playerId}`);
  }

  // On arrow key press, navigate to next or prev Annotation
  handleArrowKeys(e) {
    if (!this.plugin.active) return;
    const keyId = e.which;

    if (keyId == 37) this.plugin.annotationState.prevAnnotation();
    if (keyId == 39) this.plugin.annotationState.nextAnnotation();
  }

  // Adds help text to cursor during annotation mode
  bindCursorTooltip() {
    const tooltipEl = this.tooltipEl;
    const coverCanvasEl = this.$UI.coverCanvas;
    if (!tooltipEl || !coverCanvasEl) return;

    this.tooltipArea = Utils.areaOfHiddenEl(
      tooltipEl,
      coverCanvasEl,
      this.UI_CLASSES.hidden
    );

    // Assert bounds are updated in plugin in case page was modified since creation, so tooltip math is correct
    this.plugin.setBounds(false);
    this.eventManager.on(
      document,
      `mousemove.vac-tooltip-${this.playerId}`,
      Utils.throttle(event => {
        if (!this.plugin.bounds) return;

        const x = event.pageX;
        const y = event.pageY;
        const outOfBounds =
          x < this.plugin.bounds.left ||
          x > this.plugin.bounds.right ||
          y < this.plugin.bounds.top ||
          y > this.plugin.bounds.bottom;
        const withinControls = !outOfBounds && y >= this.plugin.bounds.bottomWithoutControls;
        const markerHovered = hasClass(tooltipEl, 'vac-marker-hover');

        if (outOfBounds) {
          addClass(tooltipEl, this.UI_CLASSES.hidden);
          return;
        }

        const cursorX = x - this.plugin.bounds.left;
        const cursorY = y - this.plugin.bounds.top;
        const margin = 10;
        const rightEdge = width(this.player.el());
        const bottomEdge = height(this.player.el()) - height(this.$UI.controlBar);
        const atRightEdge = cursorX + this.tooltipArea.width + margin * 2 >= rightEdge;
        const atBottomEdge = cursorY + this.tooltipArea.height + margin * 2 >= bottomEdge;

        // is the tooltip too close to the right or bottom edge?
        const posX = atRightEdge ? rightEdge - this.tooltipArea.width - margin : cursorX + margin;
        const posY = atBottomEdge
          ? bottomEdge - this.tooltipArea.height - margin
          : cursorY + margin;

        // hide if the cursor is over the control bar but not hovering over the draggable marker
        // also hide if mouse is down
        if ((withinControls && !markerHovered) || hasClass(tooltipEl, 'vac-cursor-dragging')) {
          addClass(tooltipEl, this.UI_CLASSES.hidden);
        } else {
          removeClass(tooltipEl, this.UI_CLASSES.hidden);
        }

        css(tooltipEl, {
          left: `${posX}px`,
          top: `${posY}px`
        });
      }, 50)
    );
  }

  get $tooltip() {
    this.$tooltip_ = this.$tooltip_ || qs(this.$player, '.vac-cursor-tool-tip');
    return this.$tooltip_;
  }

  get tooltipEl() {
    if (this.tooltipEl_) return this.tooltipEl_;
    const el = qs(this.player.el(), '.vac-cursor-tool-tip');
    if (el) this.tooltipEl_ = el;
    return el;
  }
};
