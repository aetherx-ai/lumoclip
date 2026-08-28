import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import App from './App.tsx';

import AIVideoClipper from './pages/AIVideoClipper.tsx';
import LongVideoToShorts from './pages/LongVideoToShorts.tsx';
import AIShortsGenerator from './pages/AIShortsGenerator.tsx';
import YouTubeToShorts from './pages/YouTubeToShorts.tsx';

import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>

        {/* Main LumoClip application */}
        <Route path="/" element={<App />} />

        {/* SEO Landing Pages */}
        <Route
          path="/ai-video-clipper"
          element={<AIVideoClipper />}
        />

        <Route
          path="/long-video-to-shorts"
          element={<LongVideoToShorts />}
        />

        <Route
          path="/ai-shorts-generator"
          element={<AIShortsGenerator />}
        />

        <Route
          path="/youtube-to-shorts"
          element={<YouTubeToShorts />}
        />

      </Routes>
    </BrowserRouter>
  </StrictMode>,
);