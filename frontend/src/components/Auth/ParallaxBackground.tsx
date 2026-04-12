import { useEffect } from 'react';

interface ParallaxBackgroundProps {
  showPlanet?: boolean;
}

export default function ParallaxBackground({ showPlanet = true }: ParallaxBackgroundProps) {
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      const planetLayer = document.getElementById('parallax-planet');
      const dictionaryLayer = document.getElementById('parallax-dictionary');
      
      if (planetLayer) {
        planetLayer.style.transform = `translateY(${scrolled * 0.3}px)`;
      }
      if (dictionaryLayer) {
        dictionaryLayer.style.transform = `translateY(${scrolled * 0.5}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden z-0">
      <div className="parallax-gradient" />
      
      <div 
        id="parallax-dictionary"
        className="parallax-layer-dictionary"
        style={{ 
          backgroundImage: 'url(/images/dictionary.svg)',
          opacity: showPlanet ? 0 : 1,
          transform: showPlanet ? 'translateX(-50px)' : 'translateX(0)'
        }}
      />
      
      <div 
        id="parallax-planet"
        className="parallax-layer-planet"
        style={{ 
          backgroundImage: 'url(/images/planet.svg)',
          opacity: showPlanet ? 1 : 0,
          transform: showPlanet ? 'translateX(0)' : 'translateX(50px)'
        }}
      />
      
      <div className="parallax-overlay" />
    </div>
  );
}
