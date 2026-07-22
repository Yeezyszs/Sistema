/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Cor da marca — azul profundo ancorado em #000F89 (tons 600/700).
        // Ajuste os valores aqui para reafinar o sistema inteiro de uma vez.
        brand: {
          50: '#eaecfa',
          100: '#d3d7f4',
          200: '#a6afe9',
          300: '#7684dd',
          400: '#4a5cce',
          500: '#2739b8',
          600: '#101f95',
          700: '#000f89',
          800: '#00095e',
          900: '#000640',
        },
      },
    },
  },
  plugins: [],
};
