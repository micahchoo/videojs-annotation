/**
 * React hook for Video.js Annotation Comments plugin.
 *
 * @example
 * import { useAnnotationComments } from 'videojs-annotation/react';
 *
 * function VideoAnnotations({ player }) {
 *   const { ready, active, annotations, toggle, fire } = useAnnotationComments({
 *     player,
 *     options: { meta: { user_id: 1, user_name: 'Jane' } }
 *   });
 *
 *   if (!ready) return null;
 *   return <button onClick={toggle}>{active ? 'Hide' : 'Show'} Annotations</button>;
 * }
 */
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook to integrate Video.js Annotation Comments plugin with React.
 *
 * @param {Object} params
 * @param {import('video.js').VideoJsPlayer} params.player - Video.js player instance (must already have the plugin registered)
 * @param {Object} [params.options] - Plugin configuration options
 * @param {Function} [params.onStateChanged] - Called when annotation state changes
 * @param {Function} [params.onAnnotationOpened] - Called when an annotation is opened
 * @param {Function} [params.onAnnotationClosed] - Called when an annotation is closed
 * @returns {{ plugin: Object|null, ready: boolean, active: boolean, annotations: Array, toggle: Function, fire: Function }}
 */
export function useAnnotationComments({ player, options = {}, onStateChanged, onAnnotationOpened, onAnnotationClosed } = {}) {
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);
  const [annotations, setAnnotations] = useState([]);
  const pluginRef = useRef(null);

  // Stable reference for options to avoid re-init on every render
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Stable callback refs
  const callbackRefs = useRef({ onStateChanged, onAnnotationOpened, onAnnotationClosed });
  callbackRefs.current = { onStateChanged, onAnnotationOpened, onAnnotationClosed };

  // Initialize plugin
  useEffect(() => {
    if (!player) return;

    // Check if plugin is registered
    if (typeof player.annotationComments !== 'function') {
      console.warn('[vac-react] annotationComments plugin not registered on player');
      return;
    }

    const plugin = player.annotationComments(optionsRef.current);
    pluginRef.current = plugin;

    // Listeners we'll register (keep references for cleanup)
    const onEnabled = () => setActive(true);
    const onDisabled = () => setActive(false);
    const onState = (data) => {
      setAnnotations(data.detail || []);
      if (callbackRefs.current.onStateChanged) callbackRefs.current.onStateChanged(data.detail);
    };
    const onOpened = (data) => {
      if (callbackRefs.current.onAnnotationOpened) callbackRefs.current.onAnnotationOpened(data.detail);
    };
    const onClosed = (data) => {
      if (callbackRefs.current.onAnnotationClosed) callbackRefs.current.onAnnotationClosed(data.detail);
    };

    plugin.registerListener('annotationModeEnabled', onEnabled);
    plugin.registerListener('annotationModeDisabled', onDisabled);
    plugin.registerListener('onStateChanged', onState);
    plugin.registerListener('annotationOpened', onOpened);
    plugin.registerListener('annotationClosed', onClosed);

    // Wait for ready
    plugin.onReady(() => {
      setReady(true);
      setActive(!!plugin.active);
      setAnnotations(plugin.annotationState ? plugin.annotationState.data : []);
    });

    return () => {
      // Remove our specific listeners
      const ed = plugin.eventDispatcher;
      if (ed) {
        ed.unregisterListener('annotationModeEnabled', onEnabled);
        ed.unregisterListener('annotationModeDisabled', onDisabled);
        ed.unregisterListener('onStateChanged', onState);
        ed.unregisterListener('annotationOpened', onOpened);
        ed.unregisterListener('annotationClosed', onClosed);
      }
      if (typeof plugin.dispose === 'function') {
        plugin.dispose();
      }
      pluginRef.current = null;
      setReady(false);
      setActive(false);
      setAnnotations([]);
    };
  }, [player]); // Only re-init when player changes

  const toggle = useCallback(() => {
    if (pluginRef.current) pluginRef.current.toggleAnnotationMode();
  }, []);

  const fire = useCallback((type, data) => {
    if (pluginRef.current) pluginRef.current.fire(type, data);
  }, []);

  return {
    plugin: pluginRef.current,
    ready,
    active,
    annotations,
    toggle,
    fire
  };
}
