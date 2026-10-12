import type { ReactNode, SVGProps } from 'react';

export type IconName = 'arrow-up-right' | 'arrow-right' | 'arrow-left' | 'bag' | 'close' | 'plus' | 'minus' | 'trash' | 'play' | 'menu' | 'check' | 'sparkle' | 'egg' | 'grid' | 'boxes' | 'history' | 'wifi' | 'activity' | 'chevron-down' | 'shield';

type IconProps = SVGProps<SVGSVGElement> & { name: IconName; size?: number };

const paths: Record<IconName, ReactNode> = {
  'arrow-up-right': <><path d="M7 17 17 7" /><path d="M7 7h10v10" /></>,
  'arrow-right': <><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></>,
  'arrow-left': <><path d="M20 12H5" /><path d="m11 18-6-6 6-6" /></>,
  bag: <><path d="M5 8h14l1 13H4L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
  close: <><path d="m6 6 12 12" /><path d="M18 6 6 18" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  minus: <path d="M5 12h14" />,
  trash: <><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M5 7l1 14h12l1-14" /><path d="M9 7V4h6v3" /></>,
  play: <path d="m8 5 11 7-11 7V5Z" fill="currentColor" stroke="none" />,
  menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></>,
  egg: <path d="M12 3c-4.4 0-8 7.1-8 12.2A8 8 0 0 0 12 23a8 8 0 0 0 8-7.8C20 10.1 16.4 3 12 3Z" />,
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
  boxes: <><path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z" /><path d="m4 12 8 4.5 8-4.5" /><path d="m4 16.5 8 4.5 8-4.5" /><path d="M12 12v9" /></>,
  history: <><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></>,
  wifi: <><path d="M5 9.5a11 11 0 0 1 14 0" /><path d="M8 12.5a6.5 6.5 0 0 1 8 0" /><path d="M10.5 15.5a2.5 2.5 0 0 1 3 0" /><path d="M12 19h.01" /></>,
  activity: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
};

export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
