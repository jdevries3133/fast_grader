Browser extension companion of the [fast grader for Google
Classroom.](https://classfast.app/)

This project is not deployed yet.

# Development

Webpack will build the extension into `./dist`. For development, you can load
the extension "unpacked" into the browser by smiply pointing your browser
towards that directory.

This project includes the following `npm run <cmd>` scripts:

| `<cmd>`          | action                                                                               |
| ---------------- | ------------------------------------------------------------------------------------ |
| `dist`           | runs both `build` and `tailwind-build` to create a complete production-ready package |
| `build`          | build project with webpack                                                           |
| `dev`            | build project in dev mode with webpack.dev.js configuration and watch for changes    |
| `tailwind-build` | build a `styles.css` file in JIT mode (performs PurgeCSS class elimination)          |
| `tailwind-dev`   | build a `styles.css` file in dev mode and watch for changes                          |
| `test`           | run unit test suite with jest                                                        |
