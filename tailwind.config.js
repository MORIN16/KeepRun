/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        retroBlue: "#59CBE8",
        retroBackground: "#FFFDF9",
      },
    },
  },
  plugins: [],
};
