import { motion } from 'motion/react';
import { Cpu, Palette, Zap, Code } from 'lucide-react';

export function About() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="text-neon-purple text-xs font-bold uppercase tracking-[0.4em] mb-6">The Architect</div>
          <h1 className="text-5xl md:text-7xl font-display font-black text-white uppercase tracking-tighter mb-8 leading-[0.9]">
            Synthesis of <span className="text-neon-purple neon-text-glow">Mind</span> & Machine
          </h1>
          <p className="text-gray-400 text-lg font-light leading-relaxed mb-8">
            Artverse AI is not just a portfolio—it's an experiment in collaborative creativity between human intuition and artificial neural networks.
          </p>
          <div className="space-y-6 text-gray-500">
            <p>
              Started in 2023, we began exploring the intersection of cyberpunk aesthetics and generative algorithms. Our mission is to visualize the futuristic worlds that exist only in the latent space of deep learning models.
            </p>
            <p>
              Every artwork in this gallery is carefully curated, refined, and directed through complex prompt engineering and post-processing, ensuring a high-end cinematic quality that pushes the boundaries of digital art.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="relative px-8"
        >
          <div className="relative z-10 glass-card p-2 border-white/20 overflow-hidden rotation-3 shadow-[0_0_50px_rgba(188,19,254,0.2)]">
            <img 
              src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200" 
              alt="AI Core" 
              className="w-full grayscale hover:grayscale-0 transition-all duration-700"
              referrerPolicy="no-referrer"
            />
          </div>
          {/* Decorative Elements */}
          <div className="absolute -top-12 -right-4 w-64 h-64 bg-neon-purple/20 blur-[100px] -z-10" />
          <div className="absolute -bottom-12 -left-4 w-64 h-64 bg-neon-blue/20 blur-[100px] -z-10" />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { icon: <Cpu />, title: "Generative AI", desc: "Custom-trained models optimized for cyberpunk aesthetics." },
          { icon: <Palette />, title: "Art Direction", desc: "Human-led refinement for composition and lighting." },
          { icon: <Zap />, title: "Future Vision", desc: "Visualizing tomorrow's technology today." },
          { icon: <Code />, title: "Digital Craft", desc: "Expert technical post-processing and upscaling." }
        ].map((item, idx) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            viewport={{ once: true }}
            className="glass-card p-10 hover:border-white/40 transition-all group"
          >
            <div className="w-12 h-12 rounded-lg bg-cyber-gray flex items-center justify-center text-white mb-6 group-hover:bg-neon-blue group-hover:text-cyber-black transition-colors">
              {item.icon}
            </div>
            <h3 className="text-xl font-display font-bold text-white uppercase tracking-widest mb-4">{item.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
