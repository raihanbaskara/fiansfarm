import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

type BlurTextProps = {
  text: string;
  className?: string;
};

export function BlurText({ text, className = '' }: BlurTextProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const reduceMotion = useReducedMotion();
  const words = text.split(' ');

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [reduceMotion]);

  return (
    <span ref={containerRef} className={`blur-text ${className}`} aria-label={text}>
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          className="blur-word"
          aria-hidden="true"
          initial={{ filter: reduceMotion ? 'blur(0px)' : 'blur(10px)', opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : 50 }}
          animate={isVisible ? { filter: 'blur(0px)', opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.7, delay: index * 0.1, ease: 'easeOut' }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}
