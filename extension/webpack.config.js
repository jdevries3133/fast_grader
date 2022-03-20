const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const dotenv = require("dotenv");
const replace = require("buffer-replace");

dotenv.config();

const buildMode = process.env.DEPLOY_TARGET;

console.log("\033[96mBuilding in " + buildMode + " mode\033[0m");

const website =
  buildMode === "dev"
    ? "http://localhost:8000"
    : buildMode === "prod"
    ? "https://classfast.app"
    : "https://beta.classfast.app";

const oauthClientId =
  buildMode === "dev"
    ? // dev client_id
      "568001308128-fq83v3nvmk7elfdcd937qail0k9fgtkt.apps.googleusercontent.com"
    : // prod client_id
      "850669494212-vnl448og3f97mnjsusupm3lftede1r34.apps.googleusercontent.com";

if (buildMode !== "beta" && buildMode !== "prod" && buildMode !== "dev") {
  throw new Error(`Invalid build mode in environment: ${buildMode}`);
}

module.exports = {
  mode: buildMode === "dev" ? "development" : "production",
  devtool: buildMode === "dev" ? "inline-source-map" : undefined,
  entry: {
    popup: path.join(__dirname, "src", "popup.ts"),
    background: path.join(__dirname, "src", "background.ts"),
    content: path.join(__dirname, "src", "content.ts"),
  },
  output: {
    path: path.join(__dirname, "dist"),
    filename: "[name].bundle.js",
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts(x)?$/,
        loader: "babel-loader",
      },
      {
        test: /\.(j|t)s(x)?$/,
        use: ["source-map-loader"],
        enforce: "pre",
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
      {
        test: /\.ts(x)?$/,
        loader: "string-replace-loader",
        options: {
          search: /http:\/\/localhost:8000/,
          replace: website,
        },
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: "node_modules/webextension-polyfill/dist/browser-polyfill.js",
        },
        {
          from: "./src/icons/*",
          to: "icons/[name][ext]",
        },
        {
          from: "./src/fonts/*",
          to: "fonts/[name][ext]",
        },
        { from: "./src/vendor/htmx@1.6.1.js", to: "vendor/[name].js" },
        {
          from: "./src/manifest.json",
          to: "manifest.json",
          transform(buf) {
            const data = JSON.parse(buf.toString("utf8"));
            if (buildMode === "dev") {
              data["content_security_policy"] =
                "script-src 'self' 'unsafe-eval'; object-src 'self'";
            }
            data["oauth2"]["client_id"] = oauthClientId;

            return Buffer.from(JSON.stringify(data));
          },
        },
        {
          from: "./src/*.html",
          to: "[name].html",
          transform(buf) {
            return replace(buf, "http://localhost:8000", website);
          },
        },
      ],
    }),
  ],
};
