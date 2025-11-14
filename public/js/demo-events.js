(() => {
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('octodoc-demo-bus') : null;
  const getStatusTargets = () => document.querySelectorAll('[data-demo-status]');
  const getHintTargets = () => document.querySelectorAll('[data-demo-hint]');

  const setStatus = (text) => {
    getStatusTargets().forEach(el => {
      el.textContent = text;
    });
  };

  const setHint = (text) => {
    if (!text) return;
    getHintTargets().forEach(el => {
      el.textContent = text;
    });
  };

  const initialState = document.body.dataset.demoMode === 'active' ? 'Demo mode · active' : 'Demo mode · idle';
  setStatus(initialState);

  window.addEventListener('demo:session-state', event => {
    const { state, context } = event.detail || {};
    if (!state) return;
    if (state === 'active') {
      const loanLabel = context?.loanType === '5a' ? 'SBA 5(a)' : 'SBA 504';
      setStatus(`Demo mode · ${loanLabel}`);
    } else if (state === 'error') {
      setStatus('Demo mode · retry needed');
    } else {
      setStatus('Demo mode · idle');
    }
  });

  window.addEventListener('demo:timeline-update', event => {
    const { jobs = [] } = event.detail || {};
    if (!jobs.length) {
      setHint('Uploads are ready when the intake assistant turns mint.');
      return;
    }
    const activeJob = jobs.find(job => job.status !== 'done');
    if (activeJob) {
      setHint(`Processing ${activeJob.documentId?.slice(0, 6) || 'doc'} · ${activeJob.status}`);
      return;
    }
    const latest = jobs[0];
    setHint(`Latest: ${latest.documentId?.slice(0, 6) || 'doc'} · ${latest.status}`);
  });

  if (channel) {
    channel.addEventListener('message', event => {
      const { name, detail } = event.data || {};
      if (name === 'demo:session-state') {
        window.dispatchEvent(new CustomEvent(name, { detail }));
      }
      if (name === 'demo:timeline-update') {
        window.dispatchEvent(new CustomEvent(name, { detail }));
      }
    });
  }
})();
