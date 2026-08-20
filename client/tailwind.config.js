/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe6fe",
          200: "#bfd3fe",
          300: "#93b4fd",
          400: "#608bfa",
          500: "#3b63f5",
          600: "#2544ea",
          700: "#1e34d6",
          800: "#202cad",
          900: "#1f2989",
          950: "#161a54",
        },
        ink: {
          50: "#f6f7f9",
          100: "#eceef1",
          200: "#d5d9e0",
          300: "#b1b8c4",
          400: "#8690a3",
          500: "#677087",
          600: "#525a70",
          700: "#43495b",
          800: "#393e4c",
          900: "#1a1d26",
          950: "#101218",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)",
      },
    },
  },
  plugins: [],
};
