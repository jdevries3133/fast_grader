/**
 *
 * DEPLOY_TARGET is an environment variable as follows:
 *
 * Enum {
 *   "beta";
 *   "prod";
 *   "dev";
 * }
 *
 * Behavior that is customized based on build mode includes:
 *
 * - which base URL the extension points backend requests towards (`localhost:8000`,
 *   `beta.classfast.app`, or `classfast.app`)
 * - how the extension is titled in the manifest
 * - which oauth client ID is used.
 * - which public key is used
 */
const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const dotenv = require("dotenv");
const replace = require("buffer-replace");
const { gitDescribeSync } = require("git-describe");

dotenv.config();

const buildMode = process.env.DEPLOY_TARGET;

// validate build mode is `beta`, `prod`, or `dev`
if (!["beta", "prod", "dev"].includes(buildMode)) {
  throw new Error(`Invalid build mode: ${buildMode}`);
}

console.log("\033[96mBuilding in " + buildMode + " mode\033[0m");

const website =
  buildMode === "dev"
    ? "http://localhost:8000"
    : buildMode === "prod"
    ? "https://classfast.app"
    : "https://beta.classfast.app";

const name =
  buildMode === "prod"
    ? "Grade Sync for Fast Grader"
    : "Grade Sync for Fast Grader (Beta)";

const oauthClientId =
  buildMode === "dev"
    ? // dev client_id
      "568001308128-fq83v3nvmk7elfdcd937qail0k9fgtkt.apps.googleusercontent.com"
    : // prod client_id
      "850669494212-vnl448og3f97mnjsusupm3lftede1r34.apps.googleusercontent.com";

const key =
  buildMode === "prod"
    ? "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjHaP274cLCq9Rmwl+4yfE2EBhevK5lAZXwhKyENipNTnNOwyfESY6AB+bGkq/+KZS7UBq1syLms3//kzJcM1e/r9BOiZ1sR54a5MSFRirVUME9GGt6WMjE93JTkDXfD/mqqcB8xN39G6WVjd3k6AfjbOl+laVBSNozf6UfQcmthtUWq0UgTvct1m8IqjYlsRymfj/LPf0B9KxPD2Pgi26qq5STFZqElUENkQs9tfQz9i055HJjU1qzeq/J40zXoGXaHGBHxVOlnp/Aj/vO/BRADEbvseLY/ND8jlSw+NJnx7N2zSvjZvU9eZxo06SYuOZrk9WUKENB2VDg3cb1qnlwIDAQAB"
    : "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAv6V/jgZu8Bb+fxV5Z7R0DpP5v5Ft4SBNTIumuaLz37ISyyACTqBHZvcSyJGRSBoDwb8bS2CZ6kE+pma12Ooin05diR+Q6I9BZYpvqNQsNAewKkAy85RJZr8eTknXm9KKEMZ7GuwxyFURzB3I7gWUyf85Zr2qh80jIHCFYeJB7a9YCXkc7q+5nkmz0Jz2KlF4qK/tGOk2WmZpjgxBHxySDrVvMop25vuHYl4b3TcqozTf1TeyO8W9pDIYnGXEwHxLoORvvMmNye/o8zBqI7K+ieXhkgYJTF7fCc14DZkRPprE0bK9e9b24c/9RkX8fHbmxdMe7F/NgZCD+I75zjobdQIDAQAB";
/**
 * For tagged commits, return the semantic version. For other commits, the
 * distance from previous tag is the fourth parameter of the version, which
 * is acceptable for Chrome Web Store versions.
 *
 * i.e:
 * Tagged commit: 1.3.5
 * Untagged commit: 1.3.5.18  (18 commits since 1.3.5)
 */
const getVersion = () => {
  const git = gitDescribeSync();
  if (git.distance === 0) {
    return git.semver.version;
  }
  return `${git.semver.version}.${git.distance}`;
};

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
            const manifest = JSON.parse(buf.toString("utf8"));

            manifest["oauth2"]["client_id"] = oauthClientId;
            manifest["version"] = getVersion();
            manifest["name"] = name;
            manifest["key"] = key;

            return Buffer.from(JSON.stringify(manifest));
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
