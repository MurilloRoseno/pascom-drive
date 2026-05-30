import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/react';
import App from './App.jsx';
import { clerkConfigured, clerkPublishableKey } from './shared/clerkConfig.js';

const app = <App />;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {clerkConfigured ? <ClerkProvider publishableKey={clerkPublishableKey}>{app}</ClerkProvider> : app}
  </React.StrictMode>,
);
