const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: [
    "src/**/*"
  ],
  darkMode: "media",
  theme: {
    colors: {
      inherit: "inherit",
      current: "currentColor",
      transparent: "transparent",
      black: "#000",
      white: "#fff",
      blue: {
        100: "rgb(177 221 255)",
        200: "rgb(123 189 240)",
        300: "rgb(86 181 254)",
        400: "rgb(0 144 255)",
        500: "rgb(23 124 204)",
        600: "rgb(33 114 178)",
        700: "#3f7cac",
        800: "rgb(0 74 133)",
        900: "rgb(0 60 109)",
      },
      dew: {
        100: "#DFF8EB",
        200: "rgb(153 248 199)",
        300: "rgb(101 255 176)",
        400: "rgb(41 254 145)",
        500: "rgb(31 225 126)",
        600: "rgb(29 213 119)",
        700: "rgb(5 180 91)",
        800: "rgb(0 134 66)",
        900: "rgb(0 84 41)",
      },
      yellow: {
        100: "hsl(47deg 100% 90%)",
        200: "hsl(47deg 100% 80%)",
        300: "hsl(47deg 100% 70%)",
        400: "#ffd131",
        500: "hsl(48deg 95% 50%)",
        600: "hsl(48deg 100% 45%)",
        700: "hsl(48deg 100% 40%)",
        800: "hsl(48deg 100% 35%)",
        900: "hsl(48deg 100% 30%)",
      },
      purple: {
        100: "hsl(264deg 50% 95%)",
        200: "hsl(264deg 70% 90%)",
        300: "hsl(264deg 70% 80%)",
        400: "hsl(264deg 80% 70%)",
        500: "hsl(264deg 80% 60%)",
        600: "hsl(264deg 80% 50%)",
        700: "hsl(264deg 75% 35%)",
        800: "hsl(264deg 55% 30%)", // this is 'spanish violet'
        900: "#351431", // this is 'dark purple'
      },
      gray: {
        50: "#f9fafb",
        100: "#f3f4f6",
        200: "#e5e7eb",
        300: "#d1d5db",
        400: "#9ca3af",
        500: "#6b7280",
        600: "#4b5563",
        700: "#374151",
        800: "#1f2937",
        900: "#111827",
      },
    },
    fontFamily: {
      // new fonts
      brand: ["IbmPlexSans", ...defaultTheme.fontFamily.sans],
      sans: ["Montserrat", ...defaultTheme.fontFamily.sans],
      accent: ["Montserrat", ...defaultTheme.fontFamily.sans],
      mono: ["Inconsolata", "Consolas", "monospace"],
    },
  },
  extend: {
    screens: {
      xs: "450px",
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/line-clamp"),
    require("@tailwindcss/aspect-ratio"),
  ],
};
