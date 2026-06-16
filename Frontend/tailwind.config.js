export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary":    "#1392ec",
        "primary-dk": "#0b6fbb",
        "accent":     "#7c3aed",
        "bg-light":   "#faf8f4",
        "bg-dark":    "#0c1420",
        "cream":      "#faf8f4",
        "ink":        "#0f0e17",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Inter", "sans-serif"],
        heading: ["Inter", "sans-serif"],
      },
      fontWeight: {
        bold: "600",
        extrabold: "600",
        black: "700",
      },
      fontSize: {
        '2xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '3xl': ['1.5rem', { lineHeight: '2rem' }],
        '4xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '5xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '6xl': ['3rem', { lineHeight: '1' }],
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        }
      },
      animation: {
        marquee: 'marquee 35s linear infinite',
      },
      borderRadius: { DEFAULT:".25rem", lg:".5rem", xl:".75rem", "2xl":"1rem", "3xl":"1.5rem", full:"9999px" },
    },
  },
  plugins: [],
}
