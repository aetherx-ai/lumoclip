import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import App from './App.tsx';

// SEO / legal pages are only needed when someone lands directly on that
// specific route — they should never be part of the initial bundle that
// ships with the main "/" app.
const AIVideoClipper = lazy(() => import('./pages/AIVideoClipper.tsx'));
const LongVideoToShorts = lazy(() => import('./pages/LongVideoToShorts.tsx'));
const AIShortsGenerator = lazy(() => import('./pages/AIShortsGenerator.tsx'));
const YouTubeToShorts = lazy(() => import('./pages/YouTubeToShorts.tsx'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.tsx'));
const TermsOfService = lazy(() => import('./pages/TermsOfService.tsx'));

import { AppPreferencesProvider } from './context/AppPreferencesContext.tsx';

import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <AppPreferencesProvider>
          <Suspense fallback={null}>
            <Routes>
              {/* Main LumoClip application */}
              <Route path="/" element={<App />} />

              {/* SEO Landing Pages */}
              <Route path="/ai-video-clipper" element={<AIVideoClipper />} />
              <Route path="/long-video-to-shorts" element={<LongVideoToShorts />} />
              <Route path="/ai-shorts-generator" element={<AIShortsGenerator />} />
              <Route path="/youtube-to-shorts" element={<YouTubeToShorts />} />

              {/* Legal pages */}
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />

              {/* Catch-all 404 */}
            </Routes>
          </Suspense>
        </AppPreferencesProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
);