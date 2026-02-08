/*
    Template functions to replace Handlebars templates.
    Each function returns an HTML string based on the provided data.
    Uses template helpers for escaping and line breaks.
*/

import { breaklines } from './lib/template_helpers.js';

// ----------------------------------------------------------------------
// playerButton
// No dynamic data.
export function playerButton() {
  return `<b></b>
<i class="vac-player-icon">
  <svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" />
    <path d="M0 0h24v24H0z" fill="none" />
  </svg>
</i>`;
}

// ----------------------------------------------------------------------
// markerWrap
// No dynamic data.
export function markerWrap() {
  return `<div class="vac-marker-owrap">
  <div class="vac-marker-wrap"></div>
</div>`;
}

// ----------------------------------------------------------------------
// draggableMarker
// Data: { id, left, width }
export function draggableMarker(data) {
  const { id, left, width } = data;
  return `<div data-marker-id="${id}" class="vac-marker-draggable vac-ranged-marker" style="left: ${left}; width:${width};">\n</div>`;
}

// ----------------------------------------------------------------------
// marker
// Data: { id, rangeShow, markerClass, annotationType, left, width, zIndex,
//         showTooltip, tooltipBody, tooltipRight, tooltipTime }
export function marker(data) {
  const {
    id,
    rangeShow = false,
    markerClass = '',
    annotationType = '',
    left,
    width,
    zIndex,
    showTooltip = false,
    tooltipBody = '',
    tooltipRight = false,
    tooltipTime = ''
  } = data;

  const rangeClass = rangeShow ? 'vac-ranged-marker' : '';
  const typeClass = annotationType ? `vac-type-${annotationType}` : '';
  const tooltipRightClass = tooltipRight ? 'vac-right-side' : '';

  let tooltipHtml = '';
  if (showTooltip && tooltipBody) {
    tooltipHtml = `
        <div>
            <span class="vac-tooltip ${tooltipRightClass}">
                <b>${tooltipTime}</b> - ${tooltipBody}
            </span>
        </div>`;
  }

  const style = `left: ${left}; ${rangeShow ? `width:${width};` : ''} z-index: ${zIndex}`;
  return `<div data-marker-id="${id}" class="vac-marker ${rangeClass} ${markerClass} ${typeClass}"
    style="${style}">
    ${tooltipHtml}
</div>`;
}

// ----------------------------------------------------------------------
// comment
// Data: { id, meta: { user_name }, timeSince, body }
export function comment(data) {
  const { id, meta = {}, timeSince = '', body = '' } = data;
  const userName = meta.user_name || '';
  const bodyHtml = breaklines(body);
  return `<div class="vac-comment" data-id="${id}">
  <div class="vac-comment-header">
    <div class="vac-author-name">${userName}</div>
    <div class="vac-timestamp">${timeSince}
      <span class="vac-delete-comment">&nbsp;&nbsp;X</span>
    </div>
  </div>
  <div class="vac-comment-body">
    ${bodyHtml}
  </div>
</div>`;
}

// ----------------------------------------------------------------------
// commentList
// Data: { commentsHTML (array of sanitized HTML strings), rangeStr, allowEdit, allowDelete }
export function commentList(data) {
  const { commentsHTML = [], rangeStr = '', allowEdit = false, allowDelete = false } = data;
  const commentsHtml = commentsHTML.join('\n');
  const editLink = allowEdit ? '<a class="vac-edit-annotation">EDIT</a> | ' : '';
  const deleteLink = allowDelete ? '<a class="vac-delete-annotation">DELETE</a> | ' : '';
  return `<div class="vac-comments-container">
  <div class="vac-comments-wrap">
    ${commentsHtml}
    <div class="vac-reply-btn vac-button">ADD REPLY</div>
    <div class="vac-add-new-shapebox"></div>
  </div>
  <div class="vac-comments-control-bar">
    <div class="vac-range"><b>@</b> ${rangeStr}</div>
    <div class="vac-control-buttons">
      ${editLink}${deleteLink}<a class="vac-close-comment-list">CLOSE</a>
    </div>
  </div>
</div>`;
}

// ----------------------------------------------------------------------
// newComment
// Data: { width, top, right }
export function newComment(data) {
  const { width, top, right } = data;
  return `<div class="vac-video-write-new-wrap vac-new-comment">
  <div class="vac-video-write-new vac-is-comment">
    <div class="vac-comment-showbox" style="width:${width}px;top:${top}px;right:${right}px">
      <textarea placeholder="Enter comment..."></textarea>
      <div>
        <button class="vac-button">SAVE</button>
        <a>Cancel</a>
      </div>
    </div>
  </div>
</div>`;
}

// ----------------------------------------------------------------------
// controls
// Data: { adding, editing, showControls, allowAdd, showNav, internalCommenting,
//         writingComment, rangeStr, frameRate }
export function controls(data) {
  const {
    adding = false,
    editing = false,
    showControls = false,
    allowAdd = false,
    showNav = false,
    internalCommenting = false,
    writingComment = false,
    rangeStr = '',
    frameRate = null
  } = data;

  // Helper to conditionally render a block
  const renderIf = (cond, fn) => (cond ? fn() : '');

  // --- Normal controls (when neither adding nor editing) ---
  const normalControls = renderIf(!adding && !editing && showControls, () => `
<div class="vac-controls vac-control">
    ${allowAdd ? '<button class="vac-button">+ NEW</button>' : ''}
    ${showNav ? `
    <div class="vac-annotation-nav">
        <div class="vac-a-prev">Prev</div>
        <div class="vac-a-next">Next</div>
    </div>` : ''}
</div>`);

  // --- Adding UI ---
  const addingUI = renderIf(adding, () => `
<div class="vac-video-cover vac-control">
    <div class="vac-video-cover-canvas">
        <div class="vac-cursor-tool-tip vac-hidden">Click and drag to select</div>
    </div>
</div>
${renderIf(showControls, () => `
<div class="vac-add-controls vac-control">
    <i>Select shape + range</i>
    ${internalCommenting ? `
    <button class="vac-button">CONTINUE</button>
    <a>cancel</a>` : ''}
    <div class="vac-video-move">
        <div class="vac-a-prev">-1 sec</div>
        <div class="vac-a-next">+1 sec</div>
    </div>
    ${frameRate ? `
    <div class="vac-frame-move">
        <div class="vac-f-prev">-1 frame</div>
        <div class="vac-f-next">+1 frame</div>
    </div>` : ''}
</div>`)}
${renderIf(writingComment, () => `
<div class="vac-video-write-new-wrap vac-control">
    <div class="vac-video-write-new vac-is-annotation">
        <div>
            <h5><b>New Annotation</b> @ ${rangeStr}</h5>
            <div class="vac-comment-showbox">
                <textarea placeholder="Enter comment..."></textarea>
                <div>
                    <button class="vac-button">SAVE</button>
                    <a>Cancel</a>
                </div>
            </div>
        </div>
    </div>
</div>`)}`);

  // --- Editing UI ---
  const editingUI = renderIf(editing, () => `
<div class="vac-video-cover vac-control">
    <div class="vac-video-cover-canvas">
        <div class="vac-cursor-tool-tip vac-hidden">Click and drag to adjust</div>
    </div>
</div>
${renderIf(showControls, () => `
<div class="vac-edit-controls vac-add-controls vac-control">
    <i>Edit range + shape</i>
    <button class="vac-button vac-save-edit">SAVE</button>
    <a class="vac-cancel-edit">cancel</a>
    <div class="vac-video-move">
        <div class="vac-a-prev">-1 sec</div>
        <div class="vac-a-next">+1 sec</div>
    </div>
    ${frameRate ? `
    <div class="vac-frame-move">
        <div class="vac-f-prev">-1 frame</div>
        <div class="vac-f-next">+1 frame</div>
    </div>` : ''}
</div>`)}`);

  return normalControls + addingUI + editingUI;
}

// ----------------------------------------------------------------------
// Export as an object compatible with the existing `templates` module.
export const templates = {
  player_button: playerButton,
  marker_wrap: markerWrap,
  draggable_marker: draggableMarker,
  marker,
  comment,
  comment_list: commentList,
  new_comment: newComment,
  controls
};

export default templates;
