/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mefb: {
          blue: '#175a95',
          green: '#149308',
          // Fond Mode Clair : Un gris-bleu très doux et pro
          lightBg: '#eef2f6', 
          // Fond Mode Sombre : Un bleu nuit qui ne fatigue pas l'oeil
          darkBg: '#0a0f1d',
          // Couleur pour les cartes en mode sombre
          cardDark: '#161e2d'
        }
      }
    },
  },
  plugins: [],
}