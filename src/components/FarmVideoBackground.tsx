import { useEffect, useRef } from 'react';

type FarmVideoBackgroundProps = {
  src: string;
  className?: string;
  reduceMotion: boolean;
  priority?: boolean;
};

export function FarmVideoBackground({ src, className = '', reduceMotion, priority = false }: FarmVideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (reduceMotion) {
      video.pause();
      return;
    }

    const playVideo = () => {
      video.muted = true;
      void video.play().catch(() => {
        // Keep the dark CSS fallback if autoplay is unavailable.
      });
    };

    if (!('IntersectionObserver' in window)) {
      playVideo();
      return () => video.pause();
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) playVideo();
        else video.pause();
      }
    }, { threshold: 0.01, rootMargin: '80px 0px' });

    observer.observe(video);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [reduceMotion, src]);

  return (
    <div aria-hidden="true" className={`farm-video-background ${className}`}>
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload={priority ? 'auto' : 'metadata'}
        tabIndex={-1}
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
}
