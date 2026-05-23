import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        wizard: {
          950: '#1a1440',
          900: '#2A1F5C',
          700: '#3C3489',
          600: '#534AB7',
          400: '#7F77DD',
          300: '#AFA9EC',
          100: '#EEEDFE',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

