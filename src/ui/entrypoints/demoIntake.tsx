import React from 'react';
import { createRoot } from 'react-dom/client';
import DragDrop from '../components/Intake/DragDrop';

declare global {
  interface Window {
    dispatchEvent: (event: CustomEvent<any>) => boolean;
  }
}

const mount = () => {
  const container = document.getElementById('react-intake');
  if (!container) return;
  if (container.dataset.mounted === 'true') return;
  container.dataset.mounted = 'true';

  const onFilesAdded = (files: File[]) => {
    window.dispatchEvent(new CustomEvent('demo:intake-upload', { detail: { files } }));
  };

  const root = createRoot(container);
  root.render(
    <DragDrop label="Drop SBA documents" description="AI tags uploads instantly so you never chase borrowers." onFilesAdded={onFilesAdded} />
  );
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
