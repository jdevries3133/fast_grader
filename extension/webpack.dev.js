const { merge } = require("webpack-merge");
const CopyPlugin = require("copy-webpack-plugin");
const common = require("./webpack.common");

module.exports = merge(common, {
  mode: "development",
  devtool: "inline-source-map",
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: "./src/manifest.json",
          to: "manifest.json",
          transform(buf) {
            const data = JSON.parse(buf.toString("utf8"));
            data["content_security_policy"] =
              "script-src 'self' 'unsafe-eval'; object-src 'self'";
            data["oauth2"]["client_id"] =
              "568001308128-fq83v3nvmk7elfdcd937qail0k9fgtkt.apps.googleusercontent.com";
            return Buffer.from(JSON.stringify(data));
          },
        },
        {
          from: "./src/*.html",
          to: "[name].html",
        },
      ],
    }),
  ],
});
