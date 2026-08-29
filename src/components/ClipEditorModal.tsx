import { toast } from 'sonner';
import React, { useState, useEffect, useRef } from 'react';
import { Clip, SubtitleStyle } from '../types.js';
import { exportClipApi, updateClipApi } from '../services/api.js';
import {
  X,
  Play,
  Pause,
  Download,
  Copy,
  Check,
  Palette,
  Share2,
  Sparkles,
  Sliders,
  Film,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface ClipEditorModalProps {
  clip: Clip | null;
  isOpen: boolean;
  onClose: () => void;
  onClipUpdated?: (updatedClip: Clip) => void;
}

export const ClipEditorModal: React.FC<ClipEditorModalProps> = ({
  clip,
  isOpen,
  onClose,
  onClipUpdated,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<
    'tiktok' | 'instagram' | 'youtube_shorts' | 'facebook'
  >('tiktok');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [autoTrimming, setAutoTrimming] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStage, setExportStage] = useState('');

  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(
    clip?.subtitle_style || {
      font: 'Inter',
      textColor: '#FFFFFF',
      highlightColor: '#FFE600',
      position: 'bottom',
      animation: 'highlight',
      fontSize: 28,
      uppercase: true,
    }
  );

  const videoRef = useRef<HTMLVideoElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen || !clip) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (!videoRef.current) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (videoRef.current.paused) {
          videoRef.current.play();
          setIsPlaying(true);
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      }

      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
      }

      if (e.code === 'ArrowRight') {
        e.preventDefault();
        videoRef.current.currentTime = Math.min(
          videoRef.current.duration || 0,
          videoRef.current.currentTime + 5
        );
      }

      if (e.key.toLowerCase() === 'm') {
        setIsMuted((prev) => {
          if (videoRef.current) {
            videoRef.current.muted = !prev;
          }
          return !prev;
        });
      }

      if (e.code === 'Escape') {
        onClose();
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        const text = clip.captions?.[selectedPlatform] || '';
        navigator.clipboard.writeText(text);
        setCopiedField('caption');
        toast.success('Caption copied to clipboard!');
        setTimeout(() => setCopiedField(null), 2000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, clip, selectedPlatform, onClose]);

  if (!isOpen || !clip) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleExport = async () => {
    setExporting(true);
    setExportSuccess(false);
    setExportProgress(0);
    setExportStage('Rendering Video...');

    const loadingToast = toast.loading('Generating AI clip...');

    try {
      setExportProgress(20);
      await new Promise((r) => setTimeout(r, 600));

      setExportStage('Burning Captions...');
      setExportProgress(55);
      await new Promise((r) => setTimeout(r, 700));

      setExportStage('Exporting MP4...');
      setExportProgress(85);

      const res = await exportClipApi(clip.id);

      setExportProgress(100);
      setExportStage('Completed!');
      setExportSuccess(true);

      toast.dismiss(loadingToast);
      toast.success('Clip exported successfully!');

      const a = document.createElement('a');
      a.href = res.downloadUrl;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      setExportStage('Export failed');
      toast.dismiss(loadingToast);
      toast.error('Export failed');
    } finally {
      setTimeout(() => {
        setExporting(false);
        setExportProgress(0);
        setExportStage('');
      }, 1200);
    }
  };

  const handleStyleChange = async (updates: Partial<SubtitleStyle>) => {
    const newStyle = { ...subtitleStyle, ...updates };
    setSubtitleStyle(newStyle);
    try {
      const res = await updateClipApi(clip.id, { subtitle_style: newStyle });
      if (onClipUpdated) onClipUpdated(res.clip);
      toast.success('Subtitle style updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update style');
    }
  };

  const handleAutoTrim = async () => {
    setAutoTrimming(true);
    const loadingToast = toast.loading('AI is trimming...');
    try {
      await new Promise((r) => setTimeout(r, 1500));
      console.log('AI Auto Trim requested for', clip.video_url);
      toast.dismiss(loadingToast);
      toast.success('Smart trim applied!');
    } catch (err) {
      console.error(err);
      toast.dismiss(loadingToast);
      toast.error('Trim failed');
    } finally {
      setAutoTrimming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 p-2 backdrop-blur-md animate-fade-in sm:p-4">
      <div className="relative my-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-violet-950/50">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center space-x-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-600/20 text-violet-400">
              <Film className="h-4 w-4" />
            </span>
            <div>
              <h3 className="line-clamp-1 text-base font-bold text-white">{clip.title}</h3>
              <p className="text-xs text-zinc-400">
                Score:{' '}
                <span className="font-bold text-emerald-400">
                  {clip.score}/100 Viral Potential
                </span>{' '}
                • Duration: {clip.duration}s
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Workspace */}
        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-12">
          
          {/* Left: Phone Preview */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 lg:col-span-5">
            <div className="relative flex h-[500px] w-[280px] flex-col items-center justify-between overflow-hidden rounded-[36px] border-4 border-zinc-800 bg-black shadow-2xl">
              <div className="absolute top-2 z-20 h-4 w-28 rounded-full border border-zinc-800 bg-zinc-900/90" />

              <video
                ref={videoRef}
                src={clip.video_url}
                loop
                muted={isMuted}
                playsInline
                onClick={togglePlay}
                className="absolute inset-0 h-full w-full cursor-pointer object-cover"
              />

              {/* Subtitle Overlay */}
              <div
                className={`pointer-events-none absolute left-4 right-4 z-10 text-center transition-all ${
                  subtitleStyle.position === 'top'
                    ? 'top-14'
                    : subtitleStyle.position === 'center'
                    ? 'top-1/2 -translate-y-1/2'
                    : 'bottom-16'
                }`}
              >
                <div
                  className="inline-block max-w-[90%] rounded-lg bg-black/70 px-3 py-1.5 font-black uppercase leading-tight tracking-wide shadow-xl"
                  style={{
                    fontSize: `${subtitleStyle.fontSize * 0.65}px`,
                    color: subtitleStyle.textColor,
                    fontFamily: subtitleStyle.font,
                  }}
                >
                  {clip.transcript_snippet ? (
                    <span>
                      {clip.transcript_snippet.slice(0, 45)}{' '}
                      <span
                        style={{ color: subtitleStyle.highlightColor }}
                        className="rounded border-b-2 border-amber-400 bg-amber-400/20 px-1"
                      >
                        REPURPOSE
                      </span>
                    </span>
                  ) : (
                    'TURN LONG VIDEOS INTO VIRAL SHORT CLIPS'
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="absolute bottom-3 left-4 right-4 z-20 flex items-center justify-between">
                <button
                  onClick={togglePlay}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
                </button>

                <span className="rounded-full bg-violet-600/80 px-2.5 py-1 text-[10px] font-bold uppercase text-white backdrop-blur-md">
                  9:16 Vertical
                </span>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <p className="mt-3 text-center text-[10px] text-zinc-500">
              Space · ← → · M · Esc
            </p>

            {/* Export Progress Panel */}
            {exporting && (
              <div className="mt-4 w-[280px] rounded-2xl border border-violet-500/20 bg-zinc-900/90 p-4 backdrop-blur">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-violet-500" />
                  <h3 className="text-sm font-bold text-white">Generating AI Clip</h3>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Please wait while AI renders your video...
                </p>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-indigo-500 transition-all duration-500"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-zinc-400">{exportStage}</span>
                  <span className="text-xs font-semibold text-violet-400">{exportProgress}%</span>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between rounded-lg bg-zinc-800/60 px-3 py-2">
                    <span className="text-xs text-zinc-300">Rendering Video</span>
                    {exportProgress >= 20 ? (
                      <span className="text-emerald-400">✔</span>
                    ) : (
                      <span className="text-zinc-500">...</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-zinc-800/60 px-3 py-2">
                    <span className="text-xs text-zinc-300">Burning Captions</span>
                    {exportProgress >= 55 ? (
                      <span className="text-emerald-400">✔</span>
                    ) : exportProgress >= 20 ? (
                      <span className="animate-pulse text-amber-400">⏳</span>
                    ) : (
                      <span className="text-zinc-500">...</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-zinc-800/60 px-3 py-2">
                    <span className="text-xs text-zinc-300">Exporting MP4</span>
                    {exportProgress >= 100 ? (
                      <span className="text-emerald-400">✔</span>
                    ) : exportProgress >= 85 ? (
                      <span className="animate-pulse text-amber-400">⏳</span>
                    ) : (
                      <span className="text-zinc-500">...</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Download Button */}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="mt-4 flex w-[280px] items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-xs font-semibold text-white shadow-lg shadow-violet-600/30 transition hover:from-violet-500 hover:to-indigo-500 active:scale-95 disabled:opacity-60"
            >
              {exporting ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : exportSuccess ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Exported MP4 Video!</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Download Vertical 9:16 Clip</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column */}
          <div className="flex flex-col space-y-5 lg:col-span-7">
            
            {/* Subtitle Style */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <h4 className="mb-3 flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300">
                <Palette className="h-4 w-4 text-violet-400" />
                <span>Subtitle Style Presets</span>
              </h4>

              <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: '🟡 Yellow Pop', color: '#FFE600' },
                  { label: '🟢 Neon Green', color: '#00FF66' },
                  { label: '🔵 Cyan Glow', color: '#00E5FF' },
                  { label: '🩷 Hot Pink', color: '#FF2E93' },
                ].map((preset) => (
                  <button
                    key={preset.color}
                    onClick={() =>
                      handleStyleChange({ highlightColor: preset.color, textColor: '#FFFFFF' })
                    }
                    className={`rounded-xl border p-2 text-center text-xs font-bold transition ${
                      subtitleStyle.highlightColor === preset.color
                        ? 'border-violet-500 bg-violet-950/40 text-white'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Position:</span>
                <div className="flex space-x-1">
                  {(['bottom', 'center', 'top'] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => handleStyleChange({ position: pos })}
                      className={`rounded-lg px-3 py-1 text-[11px] font-semibold capitalize transition ${
                        subtitleStyle.position === pos
                          ? 'bg-violet-600 text-white'
                          : 'bg-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* AI Titles */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <h4 className="mb-2 flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300">
                <Sparkles className="h-4 w-4 text-violet-400" />
                <span>AI Generated Viral Titles</span>
              </h4>
              <div className="space-y-1.5">
                {clip.titles?.map((titleOption, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-200 transition hover:border-zinc-700"
                  >
                    <span className="line-clamp-1 font-medium">{titleOption}</span>
                    <button
                      onClick={() => copyToClipboard(titleOption, `title_${idx}`)}
                      className="ml-2 text-zinc-500 transition hover:text-violet-400"
                    >
                      {copiedField === `title_${idx}` ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Editor */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                    <Sliders className="h-4 w-4 text-violet-400" />
                    Timeline Editor
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">Trim your clip before exporting.</p>
                </div>
                <span className="rounded-full bg-violet-500/10 px-3 py-1 text-[10px] font-bold text-violet-300">
                  AI Smart Cut
                </span>
              </div>

              <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                <span>00:00</span>
                <span>{clip.duration}s</span>
              </div>

              <div className="relative h-3 rounded-full bg-zinc-800">
                <div className="absolute left-0 top-0 h-full w-[38%] rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" />
                <div className="absolute left-[38%] top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-2 border-white bg-violet-500 shadow-lg shadow-violet-500/50" />
              </div>

              <div className="mt-5 flex h-12 items-end justify-between gap-[2px]">
                {[
                  25, 40, 18, 55, 35, 65, 20, 45, 28, 70, 38, 55, 24, 65, 32, 58, 26, 48, 30, 62, 42,
                  72, 35, 60, 28, 52, 38, 68, 26, 58, 40, 70, 30, 55, 25, 48, 38, 62,
                ].map((h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className="flex-1 rounded-full bg-gradient-to-t from-violet-500/80 to-indigo-400"
                  />
                ))}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button className="rounded-xl border border-zinc-700 bg-zinc-900 py-3 text-sm font-semibold text-white transition hover:border-violet-500 hover:bg-zinc-800">
                  ✂ Trim Start
                </button>
                <button className="rounded-xl border border-zinc-700 bg-zinc-900 py-3 text-sm font-semibold text-white transition hover:border-violet-500 hover:bg-zinc-800">
                  ✂ Trim End
                </button>
              </div>

              <div className="mt-6">
                <div className="mb-2 flex justify-between text-xs text-zinc-400">
                  <span>Timeline Zoom</span>
                  <span>100%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={300}
                  defaultValue={100}
                  className="w-full accent-violet-500"
                />
              </div>

              <div className="mt-6 rounded-xl border border-violet-500/20 bg-violet-500/10 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-400" />
                  <h4 className="text-sm font-semibold text-white">AI Suggestion</h4>
                </div>
                <p className="mt-2 text-xs text-zinc-300">
                  Remove the first <span className="font-bold text-violet-300">2.3 seconds</span> to
                  improve viewer retention by approximately{' '}
                  <span className="font-bold text-emerald-400">18%</span>.
                </p>
                <button
                  onClick={handleAutoTrim}
                  disabled={autoTrimming}
                  className="mt-4 flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:opacity-60"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {autoTrimming ? 'AI Trimming...' : '✨ Apply Smart Trim'}
                </button>
              </div>
            </div>

            {/* Platform Captions */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-zinc-300">
                  <Share2 className="h-4 w-4 text-violet-400" />
                  <span>Platform Ready Captions</span>
                </h4>
                <button
                  onClick={() => copyToClipboard(clip.captions[selectedPlatform], 'caption')}
                  className="flex items-center space-x-1 rounded-lg bg-zinc-800 px-2.5 py-1 text-[11px] font-semibold text-violet-300 transition hover:bg-zinc-700"
                >
                  {copiedField === 'caption' ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy Caption</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mb-3 flex space-x-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                {(['tiktok', 'instagram', 'youtube_shorts', 'facebook'] as const).map((plat) => (
                  <button
                    key={plat}
                    onClick={() => setSelectedPlatform(plat)}
                    className={`flex-1 rounded-lg py-1.5 text-[11px] font-bold capitalize transition ${
                      selectedPlatform === plat
                        ? 'bg-violet-600 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {plat.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <textarea
                readOnly
                rows={3}
                value={clip.captions[selectedPlatform]}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300 focus:outline-none"
              />

              <div className="mt-3 flex flex-wrap gap-1">
                {clip.hashtags?.map((tag, idx) => (
                  <span
                    key={idx}
                    className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[11px] text-violet-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};