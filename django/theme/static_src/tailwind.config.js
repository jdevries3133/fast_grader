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
      ...colors,
      /**
       * Interact with color scheme:
       * https://coolors.co/1ca665-f5ba09-7f6a93-37392e-eee5e5
       */
      blue: {
        100: "rgb(177 221 255)",
        200: "rgb(123 189 240)",
        300: "rgb(86 181 254)",
        400: "rgb(0 144 255)",
        500: "rgb(23 124 204)",
        600: "#rgb(33 114 178)",
        700: "#3f7cac",
        800: "rgb(0 74 133)",
        900: "rgb(0 60 109)",
      },
    },
    fontFamily: {
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
