import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import {
  runEarlyDetection,
  initDevToolsDetector,
  installUnlockCommand,
  isUnlocked,
} from './utils/devtools-detector.js';

installUnlockCommand();

if (!isUnlocked() && runEarlyDetection()) {
  document.body.classList.add('devtools-open');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

if (!isUnlocked()) {
  initDevToolsDetector(
    () => {
      document.body.classList.add('devtools-open');
      window.dispatchEvent(new CustomEvent('pascom:devtools-detected', { detail: { open: true } }));
    },
    () => {
      document.body.classList.remove('devtools-open');
      window.dispatchEvent(new CustomEvent('pascom:devtools-detected', { detail: { open: false } }));
    },
  );
}
