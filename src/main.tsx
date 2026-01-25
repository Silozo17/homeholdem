import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration.scope);
        
        // Listen for updates but DON'T auto-reload
        registration.addEventListener('updatefound', () => {
          console.log('New SW version available - will activate on next visit');
        });
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
  
  // Handle controller changes gracefully - NO reload
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('SW controller changed - changes will apply on next visit');
  });
}

createRoot(document.getElementById("root")!).render(<App />);
