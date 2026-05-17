import { useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import { Send, Mail, MapPin, Phone, MessageSquare } from 'lucide-react';

export function Contact() {
  const [formState, setFormState] = useState({ name: '', email: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        <div className="lg:col-span-1">
          <h1 className="text-5xl font-display font-black text-white uppercase tracking-tighter mb-8 italic">
            Get in <span className="text-neon-blue neon-text-glow">Touch</span>
          </h1>
          <p className="text-gray-400 mb-12 font-light leading-relaxed">
            Interested in a custom AI artwork, a collaboration, or just want to nerd out about the future? Drop us a line.
          </p>

          <div className="space-y-8">
            <div className="flex items-start gap-4 grow">
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neon-blue flex-shrink-0">
                <Mail size={18} />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-1">Email</h4>
                <p className="text-gray-500 text-sm">studio@artverse-ai.com</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neon-purple flex-shrink-0">
                <MessageSquare size={18} />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-1">Collaborations</h4>
                <p className="text-gray-500 text-sm">collab@artverse-ai.com</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-neon-pink flex-shrink-0">
                <MapPin size={18} />
              </div>
              <div>
                <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-1">Location</h4>
                <p className="text-gray-500 text-sm">Metaverse / Tokyo, Japan</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {submitted ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-12 text-center h-full flex flex-col items-center justify-center"
            >
              <div className="w-20 h-20 bg-neon-blue/20 rounded-full flex items-center justify-center text-neon-blue mb-8">
                <Send size={40} />
              </div>
              <h2 className="text-3xl font-display font-bold text-white uppercase mb-4 tracking-widest">Message Received</h2>
              <p className="text-gray-400 mb-8 max-w-sm">
                Our AI sorting algorithm has successfully processed your transmission. We'll get back to you within 24 neural cycles.
              </p>
              <button 
                onClick={() => setSubmitted(false)}
                className="text-gray-500 hover:text-white transition-colors uppercase text-xs font-bold tracking-[0.3em] pb-1 border-b border-gray-500"
              >
                Send another message
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="glass-card p-8 md:p-12 space-y-8 border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.3)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Your Identity</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Full Name"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white focus:outline-none focus:border-neon-blue transition-colors"
                    value={formState.name}
                    onChange={e => setFormState({...formState, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Neural Address</label>
                  <input 
                    required
                    type="email" 
                    placeholder="Email Address"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white focus:outline-none focus:border-neon-blue transition-colors"
                    value={formState.email}
                    onChange={e => setFormState({...formState, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Subject</label>
                <input 
                  required
                  type="text" 
                  placeholder="Inquiry Type"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white focus:outline-none focus:border-neon-blue transition-colors"
                  value={formState.subject}
                  onChange={e => setFormState({...formState, subject: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Transmission Data</label>
                <textarea 
                  required
                  rows={5}
                  placeholder="Your message goes here..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white focus:outline-none focus:border-neon-blue transition-colors resize-none"
                  value={formState.message}
                  onChange={e => setFormState({...formState, message: e.target.value})}
                />
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-white text-cyber-black font-black uppercase tracking-[0.2em] py-5 rounded-xl flex items-center justify-center gap-3 hover:bg-neon-blue hover:text-white transition-all disabled:opacity-50 group"
              >
                {isSubmitting ? 'Transmitting...' : (
                  <>
                    Initialize Connection
                    <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
