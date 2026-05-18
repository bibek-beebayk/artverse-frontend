import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Share2, Copy, Link as LinkIcon, Twitter, Facebook, ExternalLink, Check } from 'lucide-react';
import { Navbar, Footer } from './Navigation.tsx';
import { cn } from '../lib/utils.ts';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col selection:bg-neon-purple/30">
      <Navbar />
      <main className="flex-grow pt-24">{children}</main>
      <Footer />
    </div>
  );
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
}

export function ImageModal({ isOpen, onClose, imageUrl, title }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12"
        >
          <motion.div 
             className="absolute inset-0 bg-cyber-black/95 backdrop-blur-2xl"
             onClick={onClose}
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative z-[101] max-w-5xl w-full h-full flex flex-col items-center justify-center"
          >
            <button 
              onClick={onClose}
              className="absolute -top-12 right-0 text-white/50 hover:text-white transition-colors flex items-center gap-2 group p-2"
            >
              <span className="text-xs uppercase tracking-[0.2em]">Close</span>
              <X size={24} className="group-hover:rotate-90 transition-transform" />
            </button>
            
            <div className="relative w-full h-full glass-card overflow-hidden flex items-center justify-center border-white/20">
               <img 
                src={imageUrl} 
                alt={title} 
                className="max-w-full max-h-full object-contain"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              
              <div className="absolute bottom-0 left-0 right-0 p-8 pt-20 bg-gradient-to-t from-cyber-black to-transparent">
                  <h3 className="text-2xl font-display font-bold text-white tracking-widest uppercase mb-2">
                    {title}
                  </h3>
                  <div className="h-1 w-20 bg-neon-purple neon-glow-purple" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  artworkTitle: string;
}

export function ShareModal({ isOpen, onClose, artworkTitle }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = window.location.href;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-6"
        >
          <motion.div 
            className="absolute inset-0 bg-cyber-black/80 backdrop-blur-md"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative z-[111] max-w-md w-full glass-card p-8 border-white/20"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-2xl font-display font-bold text-white uppercase tracking-widest mb-2">
              Share <span className="text-neon-blue">Artifact</span>
            </h3>
            <p className="text-gray-400 text-sm mb-8 font-light italic">"{artworkTitle}"</p>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Direct Link</label>
                <div className="flex gap-2">
                  <div className="flex-grow bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-xs truncate font-mono">
                    {shareUrl}
                  </div>
                  <button 
                    onClick={handleCopy}
                    className="bg-neon-blue text-cyber-black p-3 rounded-xl hover:bg-white transition-all flex items-center justify-center min-w-[48px]"
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1 mb-4 block">Social Network</label>
                <div className="grid grid-cols-3 gap-4">
                  <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-neon-blue transition-colors group">
                    <Twitter size={20} className="text-gray-400 group-hover:text-neon-blue" />
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest">Twitter</span>
                  </button>
                  <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-neon-purple transition-colors group">
                    <Facebook size={20} className="text-gray-400 group-hover:text-neon-purple" />
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest">Meta</span>
                  </button>
                  <button className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-neon-pink transition-colors group">
                    <ExternalLink size={20} className="text-gray-400 group-hover:text-neon-pink" />
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest">Other</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4 mt-16">
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="w-12 h-12 rounded-xl glass-card flex items-center justify-center text-white disabled:opacity-20 disabled:cursor-not-allowed hover:border-white/30 transition-all"
      >
        <ChevronLeft size={20} />
      </button>
      
      <div className="flex items-center gap-2">
        {Array.from({ length: totalPages }).map((_, i) => (
          <button
            key={i}
            onClick={() => onPageChange(i + 1)}
            className={cn(
              "w-12 h-12 rounded-xl font-mono text-sm border transition-all",
              currentPage === i + 1 
                ? "bg-white text-cyber-black border-white font-bold" 
                : "bg-white/5 text-gray-400 border-white/10 hover:border-white/30"
            )}
          >
            {(i + 1).toString().padStart(2, '0')}
          </button>
        ))}
      </div>

      <button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="w-12 h-12 rounded-xl glass-card flex items-center justify-center text-white disabled:opacity-20 disabled:cursor-not-allowed hover:border-white/30 transition-all"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
