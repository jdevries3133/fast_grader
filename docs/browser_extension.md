# Browser Extension

The browser extension is a close companion of the main app.

# Development

Webpack will build the extension into `./dist`. For development, you can load
the extension "unpacked" into the browser by smiply pointing your browser
towards that directory.

This project includes the following scripts:

| `<cmd>`     | action                                                                            |
| ----------- | --------------------------------------------------------------------------------- |
| `upload`    | upload to chrome web store                                                        |
| `build`     | build project with webpack                                                        |
| `dev`       | build project in dev mode with webpack.dev.js configuration and watch for changes |
| `test`      | run unit test suite with jest                                                     |
| `typecheck` | check codebase for type errors                                                    |
