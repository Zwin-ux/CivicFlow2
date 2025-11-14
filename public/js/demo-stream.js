(() => {
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('octodoc-demo-bus') : null;
  let source = null;
  let activeSession = null;
  let retryTimer = null;

  const dispatch = (name, detail) => {
    window.dispatchEvent(new CustomEvent(name, { detail }));
    channel?.postMessage({ name, detail });
  };

  const closeStream = () => {
    if (source) {
      source.close();
      source = null;
    }
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const startStream = (sessionId) => {
    if (!sessionId) return;
    if (sessionId === activeSession && source) return;
    closeStream();
    activeSession = sessionId;

    try {
      source = new EventSource(`/api/v1/sba-demo/stream/${sessionId}`);
    } catch (error) {
      console.warn('Unable to open demo stream', error);
      scheduleRetry(sessionId);
      return;
    }

    source.onmessage = (event) => {
      if (!event.data) return;
      try {
        const payload = JSON.parse(event.data);
        dispatch('demo:timeline-update', payload);
      } catch (error) {
        console.warn('Failed to parse demo stream payload', error);
      }
    };

    source.onerror = () => {
      closeStream();
      scheduleRetry(sessionId);
    };
  };

  const scheduleRetry = (sessionId) => {
    retryTimer = setTimeout(() => startStream(sessionId), 3000);
  };

  window.addEventListener('demo:session-state', (event) => {
    const detail = event.detail || {};
    if (detail.state === 'active' && detail.context?.sessionId) {
      sessionStorage.setItem('demo_session', detail.context.sessionId);
      startStream(detail.context.sessionId);
    }
    if (detail.state === 'idle') {
      activeSession = null;
      closeStream();
    }
  });

  const storedSession = sessionStorage.getItem('demo_session');
  if (storedSession) {
    startStream(storedSession);
  }
})();
