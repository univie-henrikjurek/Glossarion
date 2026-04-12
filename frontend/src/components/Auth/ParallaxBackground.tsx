import { useEffect, useState } from 'react';

interface ParallaxBackgroundProps {
  showPlanet?: boolean;
}

export default function ParallaxBackground({ showPlanet = true }: ParallaxBackgroundProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  useEffect(() => {
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 1500);
    return () => clearTimeout(timer);
  }, [showPlanet]);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const bgLayer = document.getElementById('parallax-hero-bg');
      if (bgLayer) {
        const translateY = scrolled * 0.3;
        bgLayer.style.transform = `translateY(${translateY}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const backgroundPosition = showPlanet ? '30% center' : '70% center';

  return (
    <div className="fixed inset-0 overflow-hidden z-0">
      <div className="parallax-gradient" />
      
      <div 
        id="parallax-hero-bg"
        className="parallax-hero-bg"
        style={{ 
          backgroundImage: 'url(/images/hero-bg.svg)',
          backgroundPosition: backgroundPosition,
          transition: isTransitioning ? 'background-position 1.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
        }}
      />
      
      <div className="parallax-overlay" />
    </div>
  );
}
