/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        vault: {
          background: "#1A1423",
          gold: "#D4AF37",
          orange: "#FF6F00",
          teal: "#5BC0BE",
          cream: "#F8F1E5"
        }
      }
    }
  },
  plugins: []
};
