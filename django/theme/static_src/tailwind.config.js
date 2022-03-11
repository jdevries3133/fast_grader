/**
 * This is a minimal config.
 *
 * If you need the full config, get it from here:
 * https://unpkg.com/browse/tailwindcss@latest/stubs/defaultConfig.stub.js
 */

const defaultTheme = require("tailwindcss/defaultTheme");
const colors = require("tailwindcss/colors");

module.exports = {
  mode: "jit",

  purge: [
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
    "../../**/*.js",
  ],
  darkMode: "media",
  theme: {
    colors: {
      // TODO: remove the default colors after it won't cause breakage!

      // default theme has transparent but colors don't?? Colors have 'lime'
      // but defaultTheme doesn't?? weird...
      ...colors,
      ...defaultTheme.colors,
      // TODO: change all to hsl
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
    },
    fontFamily: {
      // TODO: deprecated; remove when possible
      sans: [
        "-apple-system",
        "BlinkMacSystemFont",
        "Segoe UI",
        "Roboto",
        "Helvetica",
        "Arial",
        "sans-serif",
        "Apple Color Emoji",
        "Segoe UI Emoji",
        "Segoe UI Symbol",
      ],
      mono: ["Inconsolata", "Consolas", "monospace"],
      serif: ["Roboto Slab", "Georgia", "serif"],

      // new fonts
      brand: ["IbmPlexSans", ...defaultTheme.fontFamily.sans],
      copy: ["Montserrat", ...defaultTheme.fontFamily.sans],
      accent: ["Montserrat", ...defaultTheme.fontFamily.sans],
      mono: ["Inconsolata", "Consolas", "monospace"],
    },
    screens: {
      xs: "450px",
      ...defaultTheme.screens,
    },
    extend: {
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  variants: {
    extend: {
      borderColor: ["focus-visible"],
      opacity: ["disabled"],
    },
  },
  plugins: [
    /**
     * '@tailwindcss/forms' is the forms plugin that provides a minimal styling
     * for forms. If you don't like it or have own styling for forms,
     * comment the line below to disable '@tailwindcss/forms'.
     */
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/line-clamp"),
    require("@tailwindcss/aspect-ratio"),
  ],
};
