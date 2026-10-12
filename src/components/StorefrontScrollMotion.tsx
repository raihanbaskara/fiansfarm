import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { RefObject } from 'react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

type StorefrontScrollMotionProps = {
  rootRef: RefObject<HTMLDivElement | null>;
  reduceMotion: boolean;
};

export default function StorefrontScrollMotion({ rootRef, reduceMotion }: StorefrontScrollMotionProps) {
  useGSAP((_, contextSafe) => {
    const root = rootRef.current;
    if (!root || reduceMotion) return;

    const media = gsap.matchMedia();
    let settleTimer: number | undefined;
    let velocityTarget: HTMLElement | null = null;

    media.add(
      {
        reduceMotion: '(prefers-reduced-motion: reduce)',
        desktop: '(min-width: 1024px)',
      },
      ({ conditions }) => {
        if (conditions?.reduceMotion || reduceMotion) return;

        const revealItems = gsap.utils.toArray<HTMLElement>('[data-scroll-reveal]', root);
        revealItems.forEach((item) => {
          gsap.fromTo(
            item,
            { y: 34, autoAlpha: 0.55 },
            {
              y: 0,
              autoAlpha: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: item,
                start: 'top 90%',
                end: 'top 52%',
                scrub: 0.7,
              },
            },
          );
        });

        const velocityMark = root.querySelector<HTMLElement>('[data-scroll-velocity]');
        if (velocityMark) {
          velocityTarget = velocityMark;
          const skewTo = gsap.quickTo(velocityMark, 'skewY', { duration: 0.24, ease: 'power3.out' });
          const liftTo = gsap.quickTo(velocityMark, 'y', { duration: 0.28, ease: 'power3.out' });
          const handleVelocity = (trigger: { getVelocity: () => number }) => {
            const velocity = gsap.utils.clamp(-850, 850, trigger.getVelocity());
            skewTo(velocity / 760);
            liftTo(velocity / 150);
            if (settleTimer !== undefined) window.clearTimeout(settleTimer);
            settleTimer = window.setTimeout(() => {
              skewTo(0);
              liftTo(0);
            }, 140);
          };
          const updateFromVelocity = contextSafe ? contextSafe(handleVelocity) : handleVelocity;

          ScrollTrigger.create({
            trigger: root,
            start: 'top top',
            end: 'bottom bottom',
            onUpdate: updateFromVelocity,
          });
        }

        if (conditions?.desktop) {
          const stack = root.querySelector<HTMLElement>('[data-overlap-section]');
          const cards = stack
            ? gsap.utils.toArray<HTMLElement>('[data-overlap-card]', stack)
            : [];
          if (stack && cards.length > 1) {
            const overlapTimeline = gsap.timeline({
              scrollTrigger: {
                trigger: stack,
                start: 'top 78%',
                end: 'bottom 48%',
                scrub: 0.8,
              },
            });
            cards.slice(1).forEach((card, index) => {
              overlapTimeline.fromTo(
                card,
                { y: 28 + index * 18 },
                { y: -10 - index * 10, ease: 'none', duration: 1 },
                0,
              );
            });
          }
        }
      },
      root,
    );

    return () => {
      if (settleTimer !== undefined) window.clearTimeout(settleTimer);
      media.revert();
      if (velocityTarget) gsap.killTweensOf(velocityTarget);
    };
  }, { scope: rootRef, dependencies: [rootRef, reduceMotion], revertOnUpdate: true });

  return null;
}
