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
          background: "#F4F1EB",
          gold: "#F5A000",
          orange: "#F36B21",
          teal: "#258A88",
          cream: "#171717"
        }
      }
    }
  },
  plugins: []
};
