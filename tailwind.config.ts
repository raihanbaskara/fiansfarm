import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        heading: ["'Instrument Serif'", 'serif'],
        body: ['Barlow', 'sans-serif'],
      },
      letterSpacing: {
        editorial: '-0.055em',
      },
    },
  },
  plugins: [],
} satisfies Config;
