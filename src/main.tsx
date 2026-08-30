import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import App from './App.tsx';

import AIVideoClipper from './pages/AIVideoClipper.tsx';
import LongVideoToShorts from './pages/LongVideoToShorts.tsx';
import AIShortsGenerator from './pages/AIShortsGenerator.tsx';
import YouTubeToShorts from './pages/YouTubeToShorts.tsx';
import PrivacyPolicy from './pages/PrivacyPolicy.tsx';
import TermsOfService from './pages/TermsOfService.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
);