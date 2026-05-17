import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {MaintenanceGate} from './MaintenanceGate.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MaintenanceGate>
      <App />
    </MaintenanceGate>
  </StrictMode>,
);
