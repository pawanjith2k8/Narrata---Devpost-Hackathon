import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Share2,
  Sparkles,
  Radio,
  Sliders
} from 'lucide-react';
import { ProductionArtifact } from '../types';

interface StudioPlayerProps {
  artifact: ProductionArtifact;
  onTimeUpdate: (currentTime: number) => void;
  seekTime: number | null;
}

export const StudioPlayer: React.FC<StudioPlayerProps> = ({
  artifact,
  onTimeUpdate,
  seekTime
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(artifact.total_duration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  useEffect(() => {
    if (seekTime !== null && audioRef.current) {
      audioRef.current.currentTime = seekTime;
      if (!isPlaying) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  }, [seekTime]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const curr = audioRef.current.currentTime;
    setCurrentTime(curr);
    onTimeUpdate(curr);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = Number(e.target.value);
    setCurrentTime(target);
    if (audioRef.current) {
      audioRef.current.currentTime = target;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMute = !isMuted;
    setIsMuted(newMute);
    audioRef.current.muted = newMute;
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-gradient-to-br from-studio-900 via-studio-900 to-studio-850 border border-brand-blue/30 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-5 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-1/4 w-72 h-32 bg-brand-cyan/10 rounded-full blur-3xl pointer-events-none" />

      {/* Hidden native audio tag */}
      <audio
        ref={audioRef}
        src={artifact.audio_url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Title & Metadata Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-studio-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Master Studio Audio Ready
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Job ID: {artifact.job_id}
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-100">
            {artifact.production_info?.title || 'Master Production'}
          </h3>
          <p className="text-xs text-slate-400">
            {artifact.production_info?.logline || 'Synthesized & Assembled via ElevenLabs MCP & Gemini'}
          </p>
        </div>

        {/* Download Button */}
        <a
          href={artifact.download_url}
          download={`narrata_${artifact.job_id}.mp3`}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-studio-800 hover:bg-studio-700 border border-studio-600 transition shadow-lg self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Master MP3</span>
        </a>
      </div>

      {/* Equalizer / Visualizer Animation */}
      <div className="h-12 bg-studio-950/80 rounded-xl border border-studio-800/80 flex items-center justify-center gap-1 px-4">
        {[
          'animate-eq-1', 'animate-eq-2', 'animate-eq-3', 'animate-eq-4', 'animate-eq-5',
          'animate-eq-2', 'animate-eq-4', 'animate-eq-1', 'animate-eq-3', 'animate-eq-5',
          'animate-eq-4', 'animate-eq-2', 'animate-eq-5', 'animate-eq-1', 'animate-eq-3',
          'animate-eq-5', 'animate-eq-3', 'animate-eq-2', 'animate-eq-4', 'animate-eq-1',
          'animate-eq-2', 'animate-eq-4', 'animate-eq-1', 'animate-eq-5', 'animate-eq-3'
        ].map((anim, i) => (
          <div
            key={i}
            className={`w-1.5 rounded-full bg-gradient-to-t from-brand-blue via-brand-purple to-brand-cyan transition-all duration-300 ${
              isPlaying ? anim : 'h-1 opacity-30'
            }`}
          />
        ))}
      </div>

      {/* Playback Controls & Progress Scrubber */}
      <div className="space-y-3">
        {/* Scrubber Bar */}
        <div className="space-y-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-studio-950 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
          />
          <div className="flex justify-between text-[11px] font-mono text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          {/* Main Controls: Play/Pause */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
                }
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-studio-800 transition"
              title="Rewind 10s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-blue to-brand-purple flex items-center justify-center text-white shadow-lg shadow-brand-blue/30 hover:opacity-95 active:scale-95 transition"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-white" />
              ) : (
                <Play className="w-5 h-5 fill-white ml-0.5" />
              )}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMute}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-studio-800 transition"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setVolume(val);
                  setIsMuted(val === 0);
                  if (audioRef.current) {
                    audioRef.current.volume = val;
                    audioRef.current.muted = val === 0;
                  }
                }}
                className="w-16 h-1.5 bg-studio-950 rounded-lg appearance-none cursor-pointer accent-brand-blue hidden sm:block"
              />
            </div>
          </div>

          {/* Speed Presets */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-studio-950 border border-studio-800 text-xs font-mono">
            {[0.8, 1.0, 1.2, 1.5].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => changeSpeed(rate)}
                className={`px-2 py-1 rounded-lg transition ${
                  playbackRate === rate
                    ? 'bg-brand-blue/20 text-brand-cyan font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
