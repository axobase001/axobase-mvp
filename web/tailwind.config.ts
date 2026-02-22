import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        axo: {
          dark: '#0a0a0f',
          panel: '#13131f',
          accent: '#00d4aa',
          danger: '#ff4757',
          warning: '#ffa502',
          info: '#3742fa',
        }
      }
    },
  },
  plugins: [],
};
export default config;
