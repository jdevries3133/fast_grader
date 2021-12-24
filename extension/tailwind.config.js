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

  purge: ["src/**/*"],

  darkMode: "media",
  theme: {
    colors: {
      /**
       * Interact with color scheme:
       * https://coolors.co/1ca665-f5ba09-7f6a93-37392e-eee5e5
       */
      green: "hsl(152, 71%, 38%)",
      yellow: "hsl(45, 93%, 50%)",
      orange: colors.orange,
      purple: "hsl(271, 16%, 50%)",
      ...colors,
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
