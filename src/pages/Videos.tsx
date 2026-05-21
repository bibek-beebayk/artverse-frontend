import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { VideoClip } from '../types.ts';
import { Pagination, SmartImage } from '../components/Common.tsx';
import { cn } from '../lib/utils.ts';
import { getVideos } from '../lib/api.ts';

interface VideoCardProps {
  video: VideoClip;
}

const ITEMS_PER_PAGE = 4;

const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleTimeUpdate = () => {
      const p = (videoElement.currentTime / videoElement.duration) * 100;
      setProgress(p);
    };

    const handleEnded = () => setIsPlaying(false);

    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('ended', handleEnded);

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) videoRef.current.volume = v;
    setIsMuted(v === 0);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = (parseFloat(e.target.value) / 100) * (videoRef.current?.duration || 0);
    if (videoRef.current) videoRef.current.currentTime = time;
    setProgress(parseFloat(e.target.value));
  };

  const toggleFullscreen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <motion.div 
      ref={containerRef}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "relative rounded-3xl overflow-hidden glass-card group cursor-pointer border-white/5 transition-all duration-500 bg-cyber-black",
        isFullscreen ? "w-screen h-screen rounded-none" : "aspect-[9/16] hover:border-neon-pink/50 shadow-2xl"
      )}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onClick={togglePlay}
    >
      <SmartImage
        src={video.thumbnailUrl}
        alt={video.title}
        className="absolute inset-0"
        imgClassName={cn(
          "w-full h-full object-cover transition-opacity duration-700",
          isPlaying ? "opacity-0" : "opacity-100"
        )}
        referrerPolicy="no-referrer"
        loading="lazy"
      />
      
      <video
        ref={videoRef}
        src={video.videoUrl}
        loop
        muted={isMuted}
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className={cn(
        "absolute inset-0 bg-gradient-to-t from-cyber-black via-transparent to-cyber-black/20 transition-opacity duration-300",
        showControls || !isPlaying ? "opacity-100" : "opacity-0"
      )} />

      <div className={cn(
        "absolute top-0 inset-x-0 p-6 flex justify-between items-start transition-transform duration-300",
        showControls || !isPlaying ? "translate-y-0" : "-translate-y-full"
      )}>
        <div>
          <h3 className="text-xl font-display font-black text-white uppercase tracking-wider mb-1">
            {video.title}
          </h3>
          <p className="text-[10px] text-neon-blue font-mono uppercase tracking-[0.3em]">
            Neural Sequence / 4K
          </p>
        </div>
      </div>

      <AnimatePresence>
        {!isPlaying && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-neon-pink/20 backdrop-blur-xl border border-neon-pink/40 flex items-center justify-center text-white shadow-[0_0_30px_rgba(255,0,123,0.3)]"
          >
            <Play size={32} className="fill-current ml-1" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn(
        "absolute inset-x-0 bottom-0 p-6 flex flex-col gap-4 bg-gradient-to-t from-cyber-black to-transparent transition-transform duration-300",
        showControls || !isPlaying ? "translate-y-0" : "translate-y-full"
      )}>
        <div className="relative w-full group/progress">
          <input 
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleProgressChange}
            onClick={(e) => e.stopPropagation()}
            className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-neon-pink transition-all group-hover/progress:h-2"
          />
          <div 
            className="absolute left-0 top-0 h-1 group-hover/progress:h-2 bg-neon-pink rounded-full pointer-events-none neon-glow-pink" 
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={togglePlay}
              className="text-white hover:text-neon-pink transition-colors"
            >
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            </button>

            <div className="flex items-center gap-3 group/volume">
              <button 
                onClick={toggleMute}
                className="text-white hover:text-neon-blue transition-colors"
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input 
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                onClick={(e) => e.stopPropagation()}
                className="w-0 overflow-hidden group-hover/volume:w-20 transition-all duration-300 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-neon-blue"
              />
            </div>
          </div>

          <button 
            onClick={toggleFullscreen}
            className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </div>

      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-20 pointer-events-none group-hover:opacity-40 transition-opacity">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-0.5 w-4 bg-white" />
        ))}
      </div>
    </motion.div>
  );
}

export function Videos() {
  const [videos, setVideos] = useState<VideoClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(videos.length / ITEMS_PER_PAGE);
  const currentItems = videos.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    const loadVideos = async () => {
      try {
        setVideos(await getVideos());
      } catch (loadError) {
        console.error("Failed to load videos:", loadError);
        setError("Videos are temporarily unavailable.");
      } finally {
        setLoading(false);
      }
    };

    void loadVideos();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <header className="mb-16">
        <div className="inline-block px-3 py-1 rounded-sm bg-neon-pink/20 border-l-4 border-neon-pink text-neon-pink text-[10px] uppercase tracking-[0.4em] font-bold mb-6">
          Motion Graphics / AI FX
        </div>
        <h1 className="text-5xl md:text-7xl font-display font-black text-white uppercase tracking-tighter mb-4">
          Kinetic <span className="italic font-light">Vision</span>
        </h1>
        <p className="text-gray-500 max-w-xl text-sm leading-relaxed uppercase tracking-wider">
          Experience the motion of the future. Vertical video clips featuring AI-driven animation, particle systems, and neural landscapes.
        </p>
      </header>

      {loading ? (
        <div className="glass-card border-white/10 p-8 text-center text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
          Loading videos
        </div>
      ) : error ? (
        <div className="glass-card border-white/10 p-8 text-center text-sm text-neon-pink">
          {error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 min-h-[600px]">
            <AnimatePresence mode="popLayout" initial={false}>
              {currentItems.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </AnimatePresence>
          </div>

          {currentItems.length === 0 && (
            <div className="glass-card border-white/10 p-8 text-center text-sm text-gray-500">
              No video clips are available yet.
            </div>
          )}

          {totalPages > 0 && (
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
