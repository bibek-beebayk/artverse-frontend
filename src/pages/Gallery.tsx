import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  Maximize,
  Maximize2,
  Minimize,
  Pause,
  Play,
  Share2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import type { Artwork, Category, VideoClip } from '../types.ts';
import { ImageModal, Pagination, ShareModal, SmartImage } from '../components/Common.tsx';
import { cn } from '../lib/utils.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { getArtworks, getGalleryCategories, getVideos } from '../lib/api.ts';

const IMAGE_ITEMS_PER_PAGE = 6;
const VIDEO_ITEMS_PER_PAGE = 4;

type MediaTab = 'images' | 'videos';

function normalizeTab(value: string | null): MediaTab {
  return value === 'videos' ? 'videos' : 'images';
}

interface VideoCardProps {
  video: VideoClip;
}

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
      const nextProgress = (videoElement.currentTime / videoElement.duration) * 100;
      setProgress(Number.isFinite(nextProgress) ? nextProgress : 0);
    };

    const handleEnded = () => setIsPlaying(false);

    videoElement.addEventListener('timeupdate', handleTimeUpdate);
    videoElement.addEventListener('ended', handleEnded);

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);
      videoElement.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => undefined);
    }

    setIsPlaying((current) => !current);
  };

  const toggleMute = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsMuted((current) => !current);
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextVolume = parseFloat(event.target.value);
    setVolume(nextVolume);
    if (videoRef.current) {
      videoRef.current.volume = nextVolume;
    }
    setIsMuted(nextVolume === 0);
  };

  const handleProgressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextProgress = parseFloat(event.target.value);
    const nextTime = (nextProgress / 100) * (videoRef.current?.duration || 0);
    if (videoRef.current) {
      videoRef.current.currentTime = nextTime;
    }
    setProgress(nextProgress);
  };

  const toggleFullscreen = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen().catch(() => undefined);
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => undefined);
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <motion.div
      ref={containerRef}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'relative rounded-3xl overflow-hidden glass-card group cursor-pointer border-white/5 transition-all duration-500 bg-cyber-black',
        isFullscreen ? 'w-screen h-screen rounded-none' : 'aspect-[9/16] hover:border-neon-pink/50 shadow-2xl'
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
          'w-full h-full object-cover transition-opacity duration-700',
          isPlaying ? 'opacity-0' : 'opacity-100'
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

      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-t from-cyber-black via-transparent to-cyber-black/20 transition-opacity duration-300',
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
        )}
      />

      <div
        className={cn(
          'absolute top-0 inset-x-0 p-6 flex justify-between items-start transition-transform duration-300',
          showControls || !isPlaying ? 'translate-y-0' : '-translate-y-full'
        )}
      >
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

      <div
        className={cn(
          'absolute inset-x-0 bottom-0 p-6 flex flex-col gap-4 bg-gradient-to-t from-cyber-black to-transparent transition-transform duration-300',
          showControls || !isPlaying ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        <div className="relative w-full group/progress">
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleProgressChange}
            onClick={(event) => event.stopPropagation()}
            className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-neon-pink transition-all group-hover/progress:h-2"
          />
          <div
            className="absolute left-0 top-0 h-1 group-hover/progress:h-2 bg-neon-pink rounded-full pointer-events-none neon-glow-pink"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={togglePlay} className="text-white hover:text-neon-pink transition-colors">
              {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
            </button>

            <div className="flex items-center gap-3 group/volume">
              <button onClick={toggleMute} className="text-white hover:text-neon-blue transition-colors">
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                onClick={(event) => event.stopPropagation()}
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
        {[...Array(5)].map((_, index) => (
          <div key={index} className="h-0.5 w-4 bg-white" />
        ))}
      </div>
    </motion.div>
  );
};

interface GalleryProps {
  initialTab?: MediaTab;
}

export function Gallery({ initialTab = 'images' }: GalleryProps) {
  const { isFavorited, toggleFavorite } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<MediaTab>(normalizeTab(searchParams.get('tab') || initialTab));
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [categories, setCategories] = useState<Category[]>(['All']);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [videos, setVideos] = useState<VideoClip[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [videosLoading, setVideosLoading] = useState(true);
  const [imagesError, setImagesError] = useState<string | null>(null);
  const [videosError, setVideosError] = useState<string | null>(null);
  const [currentImagePage, setCurrentImagePage] = useState(1);
  const [currentVideoPage, setCurrentVideoPage] = useState(1);
  const [selectedArt, setSelectedArt] = useState<Artwork | null>(null);
  const [shareArt, setShareArt] = useState<Artwork | null>(null);

  useEffect(() => {
    const nextTab = normalizeTab(searchParams.get('tab'));
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, searchParams]);

  useEffect(() => {
    const loadImages = async () => {
      try {
        const [categoryNames, artworkItems] = await Promise.all([
          getGalleryCategories(),
          getArtworks(),
        ]);
        setCategories(categoryNames);
        setArtworks(artworkItems);
      } catch (loadError) {
        console.error('Failed to load gallery data:', loadError);
        setImagesError('The gallery is currently unavailable.');
      } finally {
        setImagesLoading(false);
      }
    };

    const loadVideos = async () => {
      try {
        setVideos(await getVideos());
      } catch (loadError) {
        console.error('Failed to load videos:', loadError);
        setVideosError('Videos are temporarily unavailable.');
      } finally {
        setVideosLoading(false);
      }
    };

    void loadImages();
    void loadVideos();
  }, []);

  useEffect(() => {
    setCurrentImagePage(1);
  }, [activeCategory]);

  const filteredArtworks =
    activeCategory === 'All' ? artworks : artworks.filter((art) => art.category === activeCategory);
  const totalImagePages = Math.ceil(filteredArtworks.length / IMAGE_ITEMS_PER_PAGE);
  const currentImageItems = filteredArtworks.slice(
    (currentImagePage - 1) * IMAGE_ITEMS_PER_PAGE,
    currentImagePage * IMAGE_ITEMS_PER_PAGE
  );

  const totalVideoPages = Math.ceil(videos.length / VIDEO_ITEMS_PER_PAGE);
  const currentVideoItems = videos.slice(
    (currentVideoPage - 1) * VIDEO_ITEMS_PER_PAGE,
    currentVideoPage * VIDEO_ITEMS_PER_PAGE
  );

  const handleTabChange = (tab: MediaTab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'images' ? {} : { tab: tab });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
      <header className="mb-12 sm:mb-16 text-center">
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-black text-white uppercase tracking-tighter mb-4">
          Digital <span className="text-neon-purple neon-text-glow">Archives</span>
        </h1>

        <div className="mx-auto mb-8 inline-flex rounded-full border border-white/10 bg-cyber-black/40 p-1">
          {(['images', 'videos'] as MediaTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={cn(
                'rounded-full px-5 sm:px-6 py-2 text-[10px] sm:text-xs font-bold uppercase tracking-[0.24em] transition-all',
                activeTab === tab
                  ? 'bg-neon-purple text-white neon-glow-purple'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        {activeTab === 'images' ? (
          <motion.section
            key="images-tab"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.22 }}
          >
            <div className="mb-10 -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto pb-2">
              <div className="flex w-max min-w-full items-center gap-2 sm:gap-4">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      'shrink-0 whitespace-nowrap px-4 sm:px-6 py-2 rounded-full border text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all',
                      activeCategory === cat
                        ? 'bg-neon-purple border-neon-purple text-white neon-glow-purple'
                        : 'bg-transparent border-white/10 text-gray-500 hover:text-white hover:border-white/30'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {imagesLoading ? (
              <div className="glass-card border-white/10 p-8 text-center text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
                Loading gallery
              </div>
            ) : imagesError ? (
              <div className="glass-card border-white/10 p-8 text-center text-sm text-neon-pink">
                {imagesError}
              </div>
            ) : (
              <>
                <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 min-h-[800px]">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {currentImageItems.map((art) => (
                      <motion.div
                        layout
                        key={art.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        whileHover={{ scale: 1.02, y: -5 }}
                        transition={{ duration: 0.4 }}
                        className="group cursor-pointer relative"
                        onClick={() => setSelectedArt(art)}
                      >
                        <div className="glass-card overflow-hidden h-96 group-hover:border-neon-blue transition-all duration-500">
                          <SmartImage
                            src={art.thumbnailUrl || art.imageUrl}
                            alt={art.title}
                            className="w-full h-full"
                            imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />

                          <div className="absolute inset-0 bg-cyber-black/0 group-hover:bg-cyber-black/60 transition-all flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 p-8 text-center">
                            <Maximize2 size={32} className="text-neon-blue mb-4 transition-transform group-hover:scale-110" />
                            <h3 className="text-xl font-display font-bold text-white uppercase tracking-widest mb-1">
                              {art.title}
                            </h3>
                            <p className="text-xs text-neon-blue font-bold uppercase tracking-widest mb-4">
                              {art.category}
                            </p>

                            <div className="flex items-center gap-3">
                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setShareArt(art);
                                }}
                                className="flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-neon-blue hover:text-cyber-black transition-all group/share"
                              >
                                <Share2 size={16} className="group-hover/share:rotate-12 transition-transform" />
                              </button>

                              <button
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void toggleFavorite({
                                    id: art.id,
                                    title: art.title,
                                    imageUrl: art.imageUrl,
                                  });
                                }}
                                className={cn(
                                  'flex items-center gap-2 px-3 py-2 rounded-lg transition-all',
                                  isFavorited(art.id)
                                    ? 'bg-neon-pink text-white neon-glow-pink border-neon-pink'
                                    : 'bg-white/10 border border-white/20 text-white hover:bg-white hover:text-cyber-black'
                                )}
                              >
                                <Heart
                                  size={16}
                                  className={cn(
                                    'transition-transform',
                                    isFavorited(art.id) ? 'fill-current scale-110' : 'group-hover:scale-110'
                                  )}
                                />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>

                {currentImageItems.length === 0 && (
                  <div className="glass-card border-white/10 p-8 text-center text-sm text-gray-500">
                    No artworks found in this category yet.
                  </div>
                )}
              </>
            )}

            {!imagesLoading && !imagesError && totalImagePages > 0 && (
              <Pagination
                currentPage={currentImagePage}
                totalPages={totalImagePages}
                onPageChange={(page) => {
                  setCurrentImagePage(page);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </motion.section>
        ) : (
          <motion.section
            key="videos-tab"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.22 }}
          >
            {videosLoading ? (
              <div className="glass-card border-white/10 p-8 text-center text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
                Loading videos
              </div>
            ) : videosError ? (
              <div className="glass-card border-white/10 p-8 text-center text-sm text-neon-pink">
                {videosError}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 min-h-[600px]">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {currentVideoItems.map((video) => (
                      <VideoCard key={video.id} video={video} />
                    ))}
                  </AnimatePresence>
                </div>

                {currentVideoItems.length === 0 && (
                  <div className="glass-card border-white/10 p-8 text-center text-sm text-gray-500">
                    No video clips are available yet.
                  </div>
                )}

                {totalVideoPages > 0 && (
                  <Pagination
                    currentPage={currentVideoPage}
                    totalPages={totalVideoPages}
                    onPageChange={(page) => {
                      setCurrentVideoPage(page);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                )}
              </>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <ImageModal
        isOpen={!!selectedArt}
        onClose={() => setSelectedArt(null)}
        imageUrl={selectedArt?.imageUrl || ''}
        title={selectedArt?.title || ''}
      />

      <ShareModal
        isOpen={!!shareArt}
        onClose={() => setShareArt(null)}
        artworkTitle={shareArt?.title || ''}
      />
    </div>
  );
}
