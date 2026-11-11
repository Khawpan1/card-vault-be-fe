/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Tahoma', '"Leelawadee UI"', 'Arial', 'system-ui', 'sans-serif'],
        display: ['"Arial Rounded MT Bold"', 'Tahoma', 'Arial', 'sans-serif']
      },
      colors: {
        vault: {
          background: "#F7F5F1",
          surface: "#FFFFFF",
          inset: "#F2EFE9",
          line: "#D8D1C8",
          control: "#91867C",
          ink: "#25212A",
          muted: "#605762",
          gold: "#805509",
          highlight: "#FFF1D6",
          orange: "#B84016",
          "orange-hover": "#96330F",
          teal: "#19665D",
          hero: "#F1EBF8"
        }
      }
    }
  },
  plugins: []
};
