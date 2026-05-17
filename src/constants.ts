import { Artwork, VideoClip, Product } from './types.ts';

export interface CategoryData {
  id: string;
  name: string;
  description: string;
  bestFor: string;
  suitableProducts: string[];
  imageUrl: string;
}

export const CATEGORIES: CategoryData[] = [
  {
    id: 'cyberpunk-metropolis',
    name: 'Cyberpunk Metropolis',
    description: 'Neon futuristic cities, rain-soaked streets, flying vehicles, holograms, megatowers, cinematic cyberpunk worlds.',
    bestFor: 'Wallpapers, posters, canvas prints, oversized T-shirts.',
    suitableProducts: ['Wallpaper', 'Poster', 'Canvas', 'T-Shirt'],
    imageUrl: 'https://images.unsplash.com/photo-1605142859862-978be7eba909?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'mecha-futuristic-machines',
    name: 'Mecha & Futuristic Machines',
    description: 'Robots, battle mechs, futuristic motorcycles, hover cars, spaceships, AI machines, advanced technology.',
    bestFor: 'T-shirts, gaming posters, stickers, desk mats.',
    suitableProducts: ['T-Shirt', 'Poster', 'Digital Download'],
    imageUrl: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'cosmic-dreams',
    name: 'Cosmic Dreams',
    description: 'Galaxies, astronauts, nebula worlds, black holes, celestial temples, surreal space landscapes.',
    bestFor: 'Wallpapers, canvas prints, posters, hoodies.',
    suitableProducts: ['Wallpaper', 'Canvas', 'Poster', 'Digital Download'],
    imageUrl: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'dark-fantasy-realms',
    name: 'Dark Fantasy Realms',
    description: 'Dragons, cursed castles, demon warriors, ancient magic, medieval kingdoms, dark cinematic fantasy.',
    bestFor: 'Posters, hoodies, canvas prints, collector artwork.',
    suitableProducts: ['Poster', 'Canvas', 'Digital Download'],
    imageUrl: 'https://images.unsplash.com/photo-1605806616949-1e87b487fc2f?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'neon-samurai',
    name: 'Neon Samurai',
    description: 'Cyber samurai, futuristic ronin, Japanese neon streets, masked warriors, glowing swords, rain scenes.',
    bestFor: 'T-shirts, wallpapers, posters, phone cases.',
    suitableProducts: ['T-Shirt', 'Wallpaper', 'Poster'],
    imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'mythical-creatures-reimagined',
    name: 'Mythical Creatures Reimagined',
    description: 'Phoenixes, dragons, celestial wolves, sea gods, biomechanical beasts, legendary creatures with modern AI styling.',
    bestFor: 'T-shirts, mugs, stickers, canvas prints.',
    suitableProducts: ['T-Shirt', 'Mug', 'Canvas'],
    imageUrl: 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'luxury-abstracts',
    name: 'Luxury Abstracts',
    description: 'Gold textures, black marble, liquid chrome, futuristic geometry, elegant gradients, premium minimalist art.',
    bestFor: 'Canvas prints, office décor, wallpapers, laptop skins.',
    suitableProducts: ['Canvas', 'Wallpaper', 'Poster'],
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'ai-fashion-portraits',
    name: 'AI Fashion & Futuristic Portraits',
    description: 'Futuristic models, cyber fashion, glowing eyes, luxury sci-fi portraits, avant-garde AI fashion concepts.',
    bestFor: 'Posters, fashion prints, social media visuals, apparel.',
    suitableProducts: ['Poster', 'T-Shirt', 'Digital Download'],
    imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'dreamscapes-surreal-worlds',
    name: 'Dreamscapes & Surreal Worlds',
    description: 'Floating islands, impossible architecture, glowing oceans, dream cities, surreal fantasy landscapes.',
    bestFor: 'Wallpapers, canvas prints, posters, digital art packs.',
    suitableProducts: ['Wallpaper', 'Canvas', 'Poster', 'Digital Download'],
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=1200'
  },
  {
    id: 'anime-cinematics',
    name: 'Anime Cinematics',
    description: 'High-end anime-style cinematic scenes, emotional rain moments, futuristic anime worlds, action scenes.',
    bestFor: 'Wallpapers, posters, hoodies, anime-style apparel.',
    suitableProducts: ['Wallpaper', 'Poster', 'T-Shirt'],
    imageUrl: 'https://plus.unsplash.com/premium_photo-1661878265739-da90bc1af051?auto=format&fit=crop&q=80&w=1200'
  }
];

export const ARTWORKS: Artwork[] = [
  {
    id: 'art-1',
    title: 'Neon Nexus Megacity',
    category: 'Cyberpunk Metropolis',
    description: 'A sprawling cyberpunk metropolis illuminated by synthetic neon rain and light streaks.',
    tags: ['classic', 'neon', 'rain'],
    suitableProducts: ['Wallpaper', 'Poster', 'Canvas', 'T-Shirt'],
    imageUrl: 'https://images.unsplash.com/photo-1605142859862-978be7eba909?auto=format&fit=crop&q=80&w=1200',
    wallpaperDownloadUrl: 'https://images.unsplash.com/photo-1605142859862-978be7eba909?auto=format&fit=crop&q=80&w=2400',
    printProductUrl: '/shop',
    price: '$29.99',
    isFeatured: true,
    isPremium: true,
    createdAt: '2026-05-01T00:00:00Z'
  },
  {
    id: 'art-2',
    title: 'Nova Tower Zero',
    category: 'Cyberpunk Metropolis',
    description: 'High altitude hyperstructures piercing through cybernetic smog at dawn.',
    tags: ['architecture', 'smog', 'megatowers'],
    suitableProducts: ['Wallpaper', 'Poster', 'Canvas'],
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=1200',
    wallpaperDownloadUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=2400',
    printProductUrl: '/shop',
    price: '$19.99',
    isFeatured: false,
    isPremium: true,
    createdAt: '2026-05-02T00:00:00Z'
  },
  {
    id: 'art-3',
    title: 'Velocity Vector Hoverbike',
    category: 'Mecha & Futuristic Machines',
    description: 'Aerodynamic hover craft combining clean carbon curves with neon power cells.',
    tags: ['bike', 'hover', 'carbon'],
    suitableProducts: ['Poster', 'T-Shirt', 'Digital Download'],
    imageUrl: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&q=80&w=1200',
    wallpaperDownloadUrl: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&q=80&w=2400',
    printProductUrl: '/shop',
    price: '$34.99',
    isFeatured: true,
    isPremium: false,
    createdAt: '2026-05-03T00:00:00Z'
  },
  {
    id: 'art-4',
    title: 'Aegis Vanguard Mecha',
    category: 'Mecha & Futuristic Machines',
    description: 'A heavy defensive battle mech designed for planetary atmosphere defense.',
    tags: ['mech', 'battle', 'robot'],
    suitableProducts: ['Poster', 'T-Shirt', 'Digital Download'],
    imageUrl: 'https://images.unsplash.com/photo-1594913213004-ca05a18bc277?auto=format&fit=crop&q=80&w=1200',
    wallpaperDownloadUrl: 'https://images.unsplash.com/photo-1594913213004-ca05a18bc277?auto=format&fit=crop&q=80&w=2400',
    printProductUrl: '/shop',
    price: '$39.99',
    isFeatured: false,
    isPremium: true,
    createdAt: '2026-05-04T00:00:00Z'
  },
  {
    id: 'art-5',
    title: 'Nebula Sovereign Cathedral',
    category: 'Cosmic Dreams',
    description: 'An architectural marvel carved direct into an active light nebula star system.',
    tags: ['space', 'cathedral', 'nebula'],
    suitableProducts: ['Wallpaper', 'Canvas', 'Poster', 'Digital Download'],
    imageUrl: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?auto=format&fit=crop&q=80&w=1200',
    wallpaperDownloadUrl: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?auto=format&fit=crop&q=80&w=2400',
    printProductUrl: '/shop',
    price: '$45.00',
    isFeatured: true,
    isPremium: true,
    createdAt: '2026-05-01T00:00:00Z'
  },
  {
    id: 'art-6',
    title: 'Event Horizon Spacewalker',
    category: 'Cosmic Dreams',
    description: 'An explorer walking into the gorgeous gravitational distortion of a black hole.',
    tags: ['astronaut', 'blackhole', 'gravity'],
    suitableProducts: ['Wallpaper', 'Canvas', 'Poster'],
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200',
    wallpaperDownloadUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2400',
    printProductUrl: '/shop',
    price: '$29.99',
    isFeatured: false,
    isPremium: false,
    createdAt: '2026-05-05T00:00:00Z'
  },
  {
    id: 'art-7',
    title: 'Iron Citadel of Curses',
    category: 'Dark Fantasy Realms',
    description: 'A Gothic castle towering over volcanic cracks, radiating green forbidden magic.',
    tags: ['castle', 'dark', 'gothic'],
    suitableProducts: ['Poster', 'Canvas', 'Digital Download'],
    imageUrl: 'https://images.unsplash.com/photo-1605806616949-1e87b487fc2f?auto=format&fit=crop&q=80&w=1200',
    wallpaperDownloadUrl: 'https://images.unsplash.com/photo-1605806616949-1e87b487fc2f?auto=format&fit=crop&q=80&w=2400',
    printProductUrl: '/shop',
    price: '$32.00',
    isFeatured: true,
    isPremium: true,
    createdAt: '2026-05-06T00:00:00Z'
  },
  {
    id: 'art-8',
    title: 'Wyvern Sentinel Peaks',
    category: 'Dark Fantasy Realms',
    description: 'A massive biomechanical dragon creature watching over volcanic sulfur domains.',
    tags: ['dragon', 'volcano', 'sulfur'],
    suitableProducts: ['Poster', 'Canvas'],
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1200',
    wallpaperDownloadUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=2400',
    printProductUrl: '/shop',
    price: '$39.00',
    isFeatured: false,
    isPremium: false,
    createdAt: '2026-05-07T00:00:00Z'
  },
  {
    id: 'art-9',
    title: 'Neon Ronin Mask',
    category: 'Neon Samurai',
    description: 'A cybersecurity ronin with high energy neon red visor and customized traditional mask.',
    tags: ['mask', 'cyber', 'ronin'],
    suitableProducts: ['T-Shirt', 'Wallpaper', 'Poster'],
    imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=1200',
    wallpaperDownloadUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=2400',
    printProductUrl: '/shop',
    price: '$29.99',
    isFeatured: true,
    isPremium: true,
    createdAt: '2026-05-01T00:00:00Z'
  },
  {
    id: 'art-10',
    title: 'Katana Rain Reflections',
    category: 'Neon Samurai',
    description: 'A cyber samurai drawing a plasma katana amidst neon Japanese signs reflecting in the street puddles.',
    tags: ['katana', 'rain', 'plasma'],
    suitableProducts: ['T-Shirt', 'Wallpaper', 'Poster'],
    imageUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=1200',
    wallpaperDownloadUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=2400',
    printProductUrl: '/shop',
    price: '$24.99',
    isFeatured: false,
    isPremium: false,
    createdAt: '2026-05-08T00:00:00Z'
  },
  {
    id: 'art-11',
    title: 'Cybernetic Chrome Phoenix',
    category: 'Mythical Creatures Reimagined',
    description: 'Bioluminescent mechanical phoenix rising from highly energetic silicon core reactors.',
    tags: ['phoenix', 'bioluminescence', 'fusion'],
    suitableProducts: ['T-Shirt', 'Mug', 'Canvas'],
    imageUrl: 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&q=80&w=1200',
    wallpaperDownloadUrl: 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&q=80&w=2400',
    printProductUrl: '/shop',
    price: '$34.00',
    isFeatured: false,
    isPremium: true,
    createdAt: '2026-05-09T00:00:00Z'
  },
  {
    id: 'art-12',
    title: 'Luminous Solar Wolf',
    category: 'Mythical Creatures Reimagined',
    description: 'The ancient Norse solar predator reimagined in stellar matter flows and dynamic glowing energy waves.',
    tags: ['wolf', 'solar', 'aurora'],
    suitableProducts: ['T-Shirt', 'Mug', 'Canvas'],
    imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=1200',
    wallpaperDownloadUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=2400',
    printProductUrl: '/shop',
    price: '$34.00',
    isFeatured: false,
    isPremium: false,
    createdAt: '2026-05-10T00:00:00Z'
  },
  {
    id: 'art-13',
    title: 'Liquid Aurum Flow',
    category: 'Luxury Abstracts',
    description: 'A mesmerizing abstract flow of dark gold, liquid obsidian, and intricate chrome ribbons with deep rendering.',
    tags: ['abstract', 'gold', 'obsidian'],
    suitableProducts: ['Canvas', 'Wallpaper', 'Poster'],
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200',
    wallpaperDownloadUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=2400',
    printProductUrl: '/shop',
    price: '$49.99',
    isFeatured: false,
    isPremium: true,
    createdAt: '2026-05-11T00:00:00Z'
  },
  {
    id: 'art-14',
    title: 'Spheres of Premium Silence',
    category: 'Luxury Abstracts',
    description: 'Three rotating geometric brass structures positioned perfectly on black liquid marble flooring.',
    tags: ['abstract', 'minimal', 'spheres'],
    suitableProducts: ['Canvas', 'Wallpaper', 'Poster'],
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200',
    wallpaperDownloadUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=2400',
    printProductUrl: '/shop',
    price: '$45.00',
    isFeatured: false,
    isPremium: false,
    createdAt: '2026-05-12T00:00:00Z'
  },
  {
    id: 'art-15',
    title: 'Avant-Garde Synthetica portrait',
    category: 'AI Fashion & Futuristic Portraits',
    description: 'Intricate silver faceplating and neural fibers integrated perfectly into ultra-premium haute couture.',
    tags: ['portrait', 'fashion', 'synth'],
    suitableProducts: ['Poster', 'T-Shirt', 'Digital Download'],
    imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200',
    wallpaperDownloadUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=2400',
    printProductUrl: '/shop',
    price: '$29.99',
    isFeatured: false,
    isPremium: true,
    createdAt: '2026-05-13T00:00:00Z'
  },
  {
    id: 'art-16',
    title: 'Neon Empress Regal portrait',
    category: 'AI Fashion & Futuristic Portraits',
    description: 'A supreme digital portrait depicting a holographic Empress accessorized with glowing cybernetic apparel.',
    tags: ['portrait', 'fashion', 'regal'],
    suitableProducts: ['Poster', 'T-Shirt', 'Digital Download'],
    imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=1200',
    wallpaperDownloadUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=2400',
    printProductUrl: '/shop',
    price: '$35.00',
    isFeatured: false,
    isPremium: false,
    createdAt: '2026-05-14T00:00:00Z'
  },
  {
    id: 'art-17',
    title: 'Floating Columns of Aether',
    category: 'Dreamscapes & Surreal Worlds',
    description: 'White neoclassic columns with gold veins floating elegantly above a perpetual pastel cloud landscape.',
    tags: ['surreal', 'clouds', 'columns'],
    suitableProducts: ['Wallpaper', 'Canvas', 'Poster', 'Digital Download'],
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=1200',
    wallpaperDownloadUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=2400',
    printProductUrl: '/shop',
    price: '$34.00',
    isFeatured: false,
    isPremium: true,
    createdAt: '2026-05-01T00:00:00Z'
  },
  {
    id: 'art-18',
    title: 'Neon Oasis Lagoon',
    category: 'Dreamscapes & Surreal Worlds',
    description: 'An unreal exotic beach where bioluminescent pink coral patterns illuminate absolute clear warm ocean currents.',
    tags: ['surreal', 'beach', 'biolum'],
    suitableProducts: ['Wallpaper', 'Canvas', 'Poster'],
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1200',
    wallpaperDownloadUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=2400',
    printProductUrl: '/shop',
    price: '$24.99',
    isFeatured: false,
    isPremium: false,
    createdAt: '2026-05-15T00:00:00Z'
  },
  {
    id: 'art-19',
    title: 'Chrono Sakura Horizon',
    category: 'Anime Cinematics',
    description: 'A breathtaking cinematic of Sakura petals sweeping over stellar train tracks into deep sunset skies.',
    tags: ['anime', 'sunset', 'sakura'],
    suitableProducts: ['Wallpaper', 'Poster', 'T-Shirt'],
    imageUrl: 'https://plus.unsplash.com/premium_photo-1661878265739-da90bc1af051?auto=format&fit=crop&q=80&w=1200',
    wallpaperDownloadUrl: 'https://plus.unsplash.com/premium_photo-1661878265739-da90bc1af051?auto=format&fit=crop&q=80&w=2400',
    printProductUrl: '/shop',
    price: '$29.99',
    isFeatured: true,
    isPremium: true,
    createdAt: '2026-05-01T00:00:00Z'
  },
  {
    id: 'art-20',
    title: 'Digital Rain Reflection Alley',
    category: 'Anime Cinematics',
    description: 'High end anime scenery representing a quiet observer contemplating towering neon blocks under perpetual rain.',
    tags: ['anime', 'rain', 'alley'],
    suitableProducts: ['Wallpaper', 'Poster', 'T-Shirt'],
    imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=1200',
    wallpaperDownloadUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=2400',
    printProductUrl: '/shop',
    price: '$27.99',
    isFeatured: false,
    isPremium: false,
    createdAt: '2026-05-15T00:00:00Z'
  }
];

export const VIDEOS: VideoClip[] = [
  {
    id: 'v1',
    title: 'Cyber City Rain',
    thumbnailUrl: 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&q=80&w=800',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-style-city-street-ambience-39871-large.mp4'
  },
  {
    id: 'v2',
    title: 'Neon Pulse',
    thumbnailUrl: 'https://images.unsplash.com/photo-1605142859862-978be7eba909?auto=format&fit=crop&q=80&w=800',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-futuristic-urban-landscape-at-night-with-neon-lights-40011-large.mp4'
  },
  {
    id: 'v3',
    title: 'Droid Awakening',
    thumbnailUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&q=80&w=800',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-robot-factory-assembly-line-40021-large.mp4'
  },
  {
    id: 'v4',
    title: 'Data Stream',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-circuit-board-with-moving-lights-40051-large.mp4'
  },
  {
    id: 'v5',
    title: 'Quantum Core',
    thumbnailUrl: 'https://images.unsplash.com/photo-1605806616949-1e87b487fc2f?auto=format&fit=crop&q=80&w=800',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-blue-and-pink-nebula-in-space-40081-large.mp4'
  },
  {
    id: 'v6',
    title: 'Cyber Streets',
    thumbnailUrl: 'https://images.unsplash.com/photo-1594913213004-ca05a18bc277?auto=format&fit=crop&q=80&w=800',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-driving-through-a-futuristic-city-at-night-40101-large.mp4'
  }
];

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Neon Nexus Megacity Oversized T-Shirt',
    category: 'T-shirts',
    price: '$39.99',
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'p2',
    name: 'Nebula Sovereign Cathedral Canvas Print',
    category: 'Posters',
    price: '$45.00',
    imageUrl: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'p3',
    name: 'Spheres of Premium Silence Ceramic Mug',
    category: 'Mugs',
    price: '$18.00',
    imageUrl: 'https://images.unsplash.com/photo-1572113173140-5152ee53f8af?auto=format&fit=crop&q=80&w=800'
  }
];
