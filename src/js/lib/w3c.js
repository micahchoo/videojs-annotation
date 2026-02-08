/*
    W3C Web Annotation Data Model conversion utilities.
    Handles conversion between the plugin's internal format and W3C format
    at input/output boundaries.
*/

const W3C_CONTEXT = 'http://www.w3.org/ns/anno.jsonld';

// Detect whether an object is in W3C Web Annotation format
function isW3CFormat(obj) {
  if (!obj || typeof obj !== 'object') return false;
  return obj.type === 'Annotation' || obj['@context'] === W3C_CONTEXT || (obj.target != null && obj.body != null);
}

// Parse a Media Fragments URI value like "t=10,15&xywh=percent:23.47,9.88,37.36,34.32"
function parseMediaFragment(fragmentStr) {
  const result = { start: null, end: null, x: null, y: null, w: null, h: null };
  if (!fragmentStr || typeof fragmentStr !== 'string') return result;

  const parts = fragmentStr.split('&');
  for (const part of parts) {
    if (part.startsWith('t=')) {
      const vals = part.slice(2).split(',');
      result.start = parseFloat(vals[0]);
      if (vals.length > 1 && vals[1] !== '') result.end = parseFloat(vals[1]);
    } else if (part.startsWith('xywh=percent:')) {
      const vals = part.slice('xywh=percent:'.length).split(',');
      if (vals.length === 4) {
        result.x = parseFloat(vals[0]);
        result.y = parseFloat(vals[1]);
        result.w = parseFloat(vals[2]);
        result.h = parseFloat(vals[3]);
      }
    }
  }
  return result;
}

// Build a Media Fragments URI from internal range + shape
// shape uses internal {x1, y1, x2, y2} corner format
function buildMediaFragment(range, shape) {
  const parts = [];
  if (range) {
    let t = 't=' + range.start;
    if (range.end != null) t += ',' + range.end;
    parts.push(t);
  }
  if (shape && shape.x1 != null) {
    const x = Math.min(shape.x1, shape.x2);
    const y = Math.min(shape.y1, shape.y2);
    const w = Math.abs(shape.x2 - shape.x1);
    const h = Math.abs(shape.y2 - shape.y1);
    parts.push('xywh=percent:' + x + ',' + y + ',' + w + ',' + h);
  }
  return parts.join('&');
}

// Convert W3C shape {x, y, w, h} to internal {x1, y1, x2, y2}
function w3cShapeToInternal(x, y, w, h) {
  return { x1: x, y1: y, x2: x + w, y2: y + h };
}

// Convert a single W3C annotation (with optional pre-grouped _replies) to internal format
function fromW3C(w3c) {
  const internal = {};

  // ID
  internal.id = w3c.id || null;

  // Parse target selector for range + shape
  let selectorValue = null;
  if (w3c.target) {
    const target = typeof w3c.target === 'string' ? null : w3c.target;
    if (target && target.selector) {
      selectorValue = target.selector.value || null;
    }
  }

  const frag = parseMediaFragment(selectorValue);
  internal.range = { start: frag.start != null ? frag.start : 0 };
  if (frag.end != null) internal.range.end = frag.end;

  if (frag.x != null) {
    internal.shape = w3cShapeToInternal(frag.x, frag.y, frag.w, frag.h);
  } else {
    internal.shape = null;
  }

  // Extension properties
  internal.markerClass = w3c.markerClass || null;
  internal.annotationType = w3c.annotationType || null;

  // Build first comment from body + creator
  const comments = [];
  const body = w3c.body;
  if (body) {
    const comment = {
      id: w3c._commentId || null,
      meta: {
        datetime: w3c.created || new Date().toISOString(),
        user_id: (w3c.creator && w3c.creator.id != null) ? w3c.creator.id : null,
        user_name: (w3c.creator && w3c.creator.name) || null
      },
      body: typeof body === 'string' ? body : (body.value || '')
    };
    comments.push(comment);
  }

  // Process pre-grouped replies
  if (w3c._replies && Array.isArray(w3c._replies)) {
    for (const reply of w3c._replies) {
      const comment = {
        id: reply._commentId || reply.id || null,
        meta: {
          datetime: reply.created || new Date().toISOString(),
          user_id: (reply.creator && reply.creator.id != null) ? reply.creator.id : null,
          user_name: (reply.creator && reply.creator.name) || null
        },
        body: reply.body ? (typeof reply.body === 'string' ? reply.body : (reply.body.value || '')) : ''
      };
      comments.push(comment);
    }
  }

  internal.comments = comments;
  return internal;
}

// Convert internal annotation to W3C format
// Returns the main annotation object with _replies array for additional comments
function toW3C(internal, videoSrc, idPrefix) {
  idPrefix = idPrefix || '';
  const id = internal.id != null ? (idPrefix + internal.id) : null;

  const selectorValue = buildMediaFragment(internal.range, internal.shape);

  const firstComment = internal.comments && internal.comments[0];
  const creator = firstComment && firstComment.meta ? {
    type: 'Person',
    name: firstComment.meta.user_name || null,
    ...(firstComment.meta.user_id != null ? { id: String(firstComment.meta.user_id) } : {})
  } : null;

  const annotation = {
    '@context': W3C_CONTEXT,
    type: 'Annotation',
    id: id,
    motivation: 'commenting',
    body: {
      type: 'TextualBody',
      value: firstComment ? firstComment.body : '',
      format: 'text/plain'
    },
    target: {
      type: 'SpecificResource',
      source: videoSrc || '',
      selector: {
        type: 'FragmentSelector',
        conformsTo: 'http://www.w3.org/TR/media-frags/',
        value: selectorValue
      }
    },
    creator: creator,
    created: firstComment && firstComment.meta ? firstComment.meta.datetime : null
  };

  // Extension properties
  if (internal.markerClass) annotation.markerClass = internal.markerClass;
  if (internal.annotationType) annotation.annotationType = internal.annotationType;

  // Additional comments become reply annotations
  const replies = [];
  if (internal.comments && internal.comments.length > 1) {
    for (let i = 1; i < internal.comments.length; i++) {
      const c = internal.comments[i];
      const replyCreator = c.meta ? {
        type: 'Person',
        name: c.meta.user_name || null,
        ...(c.meta.user_id != null ? { id: String(c.meta.user_id) } : {})
      } : null;

      replies.push({
        '@context': W3C_CONTEXT,
        type: 'Annotation',
        id: c.id != null ? (idPrefix + c.id) : null,
        motivation: 'replying',
        body: {
          type: 'TextualBody',
          value: c.body || '',
          format: 'text/plain'
        },
        target: id,
        creator: replyCreator,
        created: c.meta ? c.meta.datetime : null
      });
    }
  }

  annotation._replies = replies;
  return annotation;
}

// Process an array of W3C annotations: group replies under their parent, then convert
function fromW3CCollection(w3cAnnotations) {
  const roots = [];
  const replyMap = {}; // parentId -> [reply, ...]

  for (const ann of w3cAnnotations) {
    if (ann.motivation === 'replying' && typeof ann.target === 'string') {
      const parentId = ann.target;
      if (!replyMap[parentId]) replyMap[parentId] = [];
      replyMap[parentId].push(ann);
    } else {
      roots.push(ann);
    }
  }

  return roots.map(root => {
    const id = root.id;
    if (id && replyMap[id]) {
      root = { ...root, _replies: replyMap[id] };
    }
    return fromW3C(root);
  });
}

// Flatten internal annotations to W3C collection (root annotations + replies interleaved)
function toW3CCollection(internalAnnotations, videoSrc, idPrefix) {
  const result = [];
  for (const ann of internalAnnotations) {
    const w3c = toW3C(ann, videoSrc, idPrefix);
    const replies = w3c._replies || [];
    delete w3c._replies;
    result.push(w3c);
    for (const reply of replies) {
      result.push(reply);
    }
  }
  return result;
}

module.exports = { isW3CFormat, parseMediaFragment, buildMediaFragment, fromW3C, toW3C, fromW3CCollection, toW3CCollection };
