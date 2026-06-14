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
        display: ["Outfit","Inter","sans-serif"],
        heading: ["Syne","Outfit","Inter","sans-serif"],
      },
      borderRadius: { DEFAULT:".25rem", lg:".5rem", xl:".75rem", "2xl":"1rem", "3xl":"1.5rem", full:"9999px" },
    },
  },
  plugins: [],
}
