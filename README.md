# videojs-annotation

Timeline annotation and commenting plugin for [Video.js](https://videojs.com/). Add time-ranged markers, shapes overlaid on the video, and threaded comments — all within the player.

> **Hard fork** of [@contently/videojs-annotation-comments](https://github.com/trilogy-group/contently-videojs-annotation-comments).
> This fork removes jQuery and Handlebars, adds W3C Web Annotation support, frame-accurate selection, a React hook, and ships as ESM/CJS/UMD with zero runtime dependencies (aside from `mitt`).

**[Live Demo](https://micahchoo.github.io/videojs-annotation/)**

![AnnotationComments Screenshot](test/screenshot.png)

> This is AI coded and made for my use, do your due diligence before using

## What changed from upstream

- Dropped jQuery and Handlebars — vanilla DOM helpers and template literals instead
- All external data uses the [W3C Web Annotation Data Model](https://www.w3.org/TR/annotation-model/) (legacy format auto-detected)
- Frame-accurate selection via `frameRate` option
- Annotation editing (range + shape) with `editAnnotation` event
- Permission flags (`allowEdit`, `allowDelete`, `allowAdd`, `restrictEditToOwner`, `restrictDeleteToOwner`)
- Annotation type system (`annotationType` field, `vac-type-{type}` CSS class)
- Bulk state replacement via `setAnnotations` event
- Granular lifecycle events (`annotationAdded`, `commentAdded`, `commentDeleted`, `annotationEdited`)
- React hook (`useAnnotationComments`)
- Build moved from Gulp + Browserify to Rollup 4 + Babel
- ESM output for tree-shaking
- Only runtime dependency: `mitt` (~200 bytes)

## Install

Install directly from GitHub:

```bash
npm install github:micahchoo/videojs-annotation
```

Or add to `package.json` dependencies:

```json
{
  "dependencies": {
    "videojs-annotation": "github:micahchoo/videojs-annotation"
  }
}
```

You also need video.js as a peer dependency:

```bash
npm install video.js
```

## Quick Start

### Script tag (UMD)

The UMD build auto-registers the plugin on the global `videojs`. No manual registration needed.

```html
<link href="node_modules/video.js/dist/video-js.css" rel="stylesheet">
<link href="node_modules/videojs-annotation/build/css/annotations.css" rel="stylesheet">
<script src="node_modules/video.js/dist/video.min.js"></script>
<script src="node_modules/videojs-annotation/build/videojs-annotation.js"></script>
<script>
  var player = videojs('my-video');
  var plugin = player.annotationComments({
    annotationsObjects: [],
    meta: { user_id: 1, user_name: 'Jane' }
  });
</script>
```

### ES Module

The ESM build exports a factory function. You must register it as a video.js plugin yourself.

```js
import videojs from 'video.js';
import AnnotationComments from 'videojs-annotation';
import 'videojs-annotation/css';

videojs.registerPlugin('annotationComments', AnnotationComments(videojs));

const player = videojs('my-video');
const plugin = player.annotationComments({
  annotationsObjects: [],
  meta: { user_id: 1, user_name: 'Jane' }
});
```

### CommonJS

```js
const videojs = require('video.js');
const AnnotationComments = require('videojs-annotation');

videojs.registerPlugin('annotationComments', AnnotationComments(videojs));
```

## Options

```js
const plugin = player.annotationComments({
  // Initial annotation data (W3C or legacy format, auto-detected)
  annotationsObjects: [],
  // Current user metadata
  meta: { user_id: null, user_name: null },
  // Navigate annotations with left/right arrow keys
  bindArrowKeys: true,
  // Show built-in control panel and toggle button
  showControls: true,
  // Show threaded comment list when an annotation is active
  showCommentList: true,
  // Allow annotations in fullscreen mode
  showFullScreen: true,
  // Show tooltip previews and shapes on marker hover during playback
  showMarkerShapeAndTooltips: true,
  // Enable the built-in comment writing UI (step 2 of adding annotations)
  internalCommenting: true,
  // Start in annotation mode immediately
  startInAnnotationMode: false,
  // Frame rate for frame-accurate selection (null = second-based)
  frameRate: null,
  // Permission flags
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  // Restrict edit/delete to the annotation owner (matches meta.user_id)
  restrictEditToOwner: false,
  restrictDeleteToOwner: false,
  // Override video source URI for W3C annotation target (auto-detected from player if null)
  videoSrc: null,
  // URI prefix for annotation IDs in W3C output (e.g. 'urn:uuid:')
  idPrefix: ''
});
```

## Annotation Data (W3C Web Annotation)

Input and output data follows the [W3C Web Annotation Data Model](https://www.w3.org/TR/annotation-model/). Time ranges and spatial regions use [Media Fragments URI](https://www.w3.org/TR/media-frags/) selectors. Threaded replies are separate annotations with `motivation: "replying"`.

```js
const annotationsObjects = [
  // Root annotation
  {
    '@context': 'http://www.w3.org/ns/anno.jsonld',
    type: 'Annotation',
    id: 'anno-1',
    motivation: 'commenting',
    body: { type: 'TextualBody', value: 'Nice shot!', format: 'text/plain' },
    target: {
      type: 'SpecificResource',
      source: 'video.mp4',
      selector: {
        type: 'FragmentSelector',
        conformsTo: 'http://www.w3.org/TR/media-frags/',
        value: 't=10,15&xywh=percent:23.5,10,37.5,34'
      }
    },
    creator: { type: 'Person', name: 'Jack Pope', id: '1' },
    created: '2024-01-15T10:30:00Z'
  },
  // Reply
  {
    '@context': 'http://www.w3.org/ns/anno.jsonld',
    type: 'Annotation',
    id: 'reply-1',
    motivation: 'replying',
    body: { type: 'TextualBody', value: 'Agreed!', format: 'text/plain' },
    target: 'anno-1',
    creator: { type: 'Person', name: 'Jane', id: '2' },
    created: '2024-01-15T11:00:00Z'
  }
];
```

**Media Fragment selectors:**
- Time only: `t=10,15` (range) or `t=10` (moment)
- With shape: `t=10,15&xywh=percent:23.5,10,37.5,34` (x, y, width, height as percentages)

**Extension properties** (optional, on root annotations):
- `markerClass` — custom CSS class on the timeline marker
- `annotationType` — adds `vac-type-{type}` class (e.g. `"review"`)

### Legacy format

The plugin auto-detects and accepts the legacy internal format for backward compatibility:

```js
const legacy = [{
  id: 'unique-id',
  range: { start: 10, end: 15 },
  shape: { x1: 23.5, y1: 10, x2: 61, y2: 44 },
  comments: [{
    id: 'comment-id',
    meta: { datetime: '2024-01-15T10:30:00Z', user_id: 1, user_name: 'Jack Pope' },
    body: 'The first comment!'
  }]
}];
```

## API

### Waiting for Ready

```js
plugin.onReady(() => {
  // plugin is initialized, safe to fire events
});
```

### Firing Events (External -> Plugin)

```js
plugin.fire('openAnnotation', { id: 'annotation-id' });
plugin.fire('closeActiveAnnotation');
plugin.fire('newAnnotation', {
  id: 'new-id',
  range: { start: 20, end: 25 },
  shape: { x1: 10, x2: 50, y1: 10, y2: 50 },
  commentStr: 'This is my comment.'
});
plugin.fire('destroyAnnotation', { id: 'annotation-id' });
plugin.fire('newComment', { annotationId: 'annotation-id', body: 'Reply text' });
plugin.fire('destroyComment', { id: 'comment-id' });
plugin.fire('setAnnotations', { annotations: [...newData] });
plugin.fire('editAnnotation', { id: 'annotation-id', range: { start: 5, end: 10 }, shape: null });
plugin.fire('addingAnnotation');
plugin.fire('cancelAddingAnnotation');
plugin.fire('toggleAnnotationMode');
```

### Listening for Events (Plugin -> External)

```js
plugin.registerListener('annotationOpened', (e) => {});    // e.detail.annotation, e.detail.triggered_by_timeline
plugin.registerListener('annotationClosed', (e) => {});    // e.detail = annotation data
plugin.registerListener('onStateChanged', (e) => {});      // e.detail = all annotation data
plugin.registerListener('annotationAdded', (e) => {});     // e.detail.annotation
plugin.registerListener('annotationDeleted', (e) => {});   // e.detail.id
plugin.registerListener('annotationEdited', (e) => {});    // e.detail.id, e.detail.annotation
plugin.registerListener('commentAdded', (e) => {});        // e.detail.annotationId, e.detail.comment
plugin.registerListener('commentDeleted', (e) => {});      // e.detail.annotationId, e.detail.commentId
plugin.registerListener('addingAnnotationDataChanged', (e) => {}); // e.detail.range, e.detail.shape
plugin.registerListener('enteredAddingAnnotation', (e) => {});     // e.detail.range
plugin.registerListener('annotationModeEnabled', () => {});
plugin.registerListener('annotationModeDisabled', () => {});
plugin.registerListener('playerBoundsChanged', (e) => {}); // e.detail = bounds object
```

## React Hook

```js
import { useAnnotationComments } from 'videojs-annotation/react';

function VideoAnnotations({ player }) {
  const { ready, active, annotations, toggle, fire, plugin } = useAnnotationComments({
    player,
    options: {
      meta: { user_id: 1, user_name: 'Jane' },
      annotationsObjects: []
    },
    onStateChanged: (data) => console.log('state changed', data),
    onAnnotationOpened: (data) => console.log('opened', data),
    onAnnotationClosed: (data) => console.log('closed', data)
  });

  if (!ready) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={toggle}>
        {active ? 'Hide' : 'Show'} Annotations ({annotations.length})
      </button>
      <button onClick={() => fire('addingAnnotation')}>
        Add Annotation
      </button>
    </div>
  );
}
```

Returns: `ready`, `active`, `annotations`, `toggle()`, `fire(type, data)`, `plugin`. React is an optional peer dependency. The hook auto-disposes on unmount.

## CSS Customization

All styles are in `build/css/annotations.css`, prefixed with `vac-`. The SCSS source is at `src/css/annotations.scss` with color variables at the top.

```css
.vac-marker { background-color: #ff6600; }
.vac-shape { border-color: #ff6600; }
```

## Development

```bash
git clone https://github.com/micahchoo/videojs-annotation.git
cd videojs-annotation
npm install
npm run build          # build to build/
npm run serve          # dev server at http://localhost:3004
npm test               # unit tests
```

The dev server serves the test pages with all dependencies resolved:
- http://localhost:3004/test.html — interactive test page with options panel
- http://localhost:3004/test_api.html — API event test page

## Build Output

- `build/videojs-annotation.js` (UMD)
- `build/videojs-annotation.min.js` (UMD, minified)
- `build/videojs-annotation.cjs.js` (CommonJS)
- `build/videojs-annotation.esm.js` (ES Module, tree-shakeable)
- `build/videojs-annotation-react.esm.js` (React hook)
- `build/css/annotations.css`

## License

[Apache License 2.0](license.md)

## Credits

Originally created by [Evan Carothers](https://github.com/ecaroth) and [Jack Pope](https://github.com/jackpope) at [Contently](https://github.com/trilogy-group/contently-videojs-annotation-comments).
