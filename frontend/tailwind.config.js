/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    screens: {
      sm: "480px",
      md: "768px",
      lg: "820px",
      xl: "1440px",
    },
    colors: {
      primary: "#2EB500",
      secondary: "#4A4A4A",
      grey: {
        100: "#F7F7F7",
        300: "#BCBCBC",
        400: "#ADADAD",
        500: "#999999",
        600: "#777777",
        700: "#676767",
        800: "#4A4A4A",
        900: "#282828",
      },
      black: {
        default: "#000000",
        500: "#0F0F0F",
      },
      blue: {
        500: "#0077F3",
        600: "#0262c6",
      },
      white: "#ffffff",
      red: "#E71A1A",
      green: "#2EB500",
      greenDark: "#2C9608",
      yellow: {
        200: "#FFFBE3",
      },
    },
    extend: {},
  },
  plugins: [],
};
