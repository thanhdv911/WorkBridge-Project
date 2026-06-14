export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary":    "#0EA5E9",
        "primary-dk": "#0284C7",
        "accent":     "#8B5CF6",
        "bg-light":   "#F8FAFC",
        "bg-dark":    "#0B1120",
        "surface":    "#FFFFFF",
        "ink":        "#0F172A",
      },
      fontFamily: {
        sans: ["'Be Vietnam Pro'", "sans-serif"],
        display: ["Lexend", "sans-serif"],
        heading: ["Lexend", "sans-serif"],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'premium': '0 20px 40px -10px rgba(0,0,0,0.08), 0 10px 20px -5px rgba(0,0,0,0.04)',
      },
      borderRadius: { DEFAULT:".25rem", lg:".5rem", xl:".75rem", "2xl":"1rem", "3xl":"1.5rem", full:"9999px" },
    },
  },
  plugins: [],
}
