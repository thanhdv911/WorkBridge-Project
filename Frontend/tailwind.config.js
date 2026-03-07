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
        "bg-light":   "#f8fafc",
        "bg-dark":    "#0c1420",
      },
      fontFamily: { display: ["Inter","sans-serif"] },
      borderRadius: { DEFAULT:".25rem", lg:".5rem", xl:".75rem", "2xl":"1rem", "3xl":"1.5rem", full:"9999px" },
    },
  },
  plugins: [],
}
