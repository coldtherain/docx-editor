import React from 'react';
import ReactDOM from 'react-dom/client';
import '@docx-editor.dev/core/styles/editor.css';
import { App } from './App';

async function bootstrap() {
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

void bootstrap();
