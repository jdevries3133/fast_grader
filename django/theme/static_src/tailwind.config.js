/**
 * This is a minimal config.
 *
 * If you need the full config, get it from here:
 * https://unpkg.com/browse/tailwindcss@latest/stubs/defaultConfig.stub.js
 */

const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: [
    /**
     * HTML. Paths to Django template files that will contain Tailwind CSS
     * classes.
     */

    /*  Templates within theme app (<tailwind_app_name>/templates), e.g. base.html. */
    "../templates/**/*.html",

    /*
     * Main templates directory of the project (BASE_DIR/templates).
     * Adjust the following line to match your project structure.
     */
    "../../templates/**/*.html",

    /*
     * Templates in other django apps (BASE_DIR/<any_app_name>/templates).
     * Adjust the following line to match your project structure.
     */
    "../../**/templates/**/*.html",

    /**
     * JS: If you use Tailwind CSS in JavaScript, uncomment the following lines and make sure
     * patterns match your project structure.
     */
    "../../grader/**/*.js",
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
      // gray is actually "zinc" from the default tailwind color pallate
      gray: {
        50: "#fafafa",
        100: "#f4f4f5",
        200: "#e4e4e7",
        300: "#d4d4d8",
        400: "#a1a1aa",
        500: "#71717a",
        600: "#52525b",
        700: "#3f3f46",
        800: "#27272a",
        900: "#18181b",
      },
      red: {
        50: "#fef2f2",
        100: "#fee2e2",
        200: "#fecaca",
        300: "#fca5a5",
        400: "#f87171",
        500: "#ef4444",
        600: "#dc2626",
        700: "#b91c1c",
        800: "#991b1b",
        900: "#7f1d1d",
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
