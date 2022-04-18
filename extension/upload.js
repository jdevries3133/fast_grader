/**
 * Script to upload the already-build extension at ./extension.zip to the chrome
 * webstore using environment variables:
 *
 * - DEPLOY_TARGET (see env.template)
 * - UPLOAD_CLIENT_ID
 * - UPLOAD_CLIENT_SECRET
 * - UPLOAD_REFRESH_TOKEN
 */

(async () => {
  const fs = require("fs");

  const { default: chromeWebstoreUpload } = await import(
    "chrome-webstore-upload"
  );
  const dotenv = require("dotenv");

  dotenv.config();

  const buildMode = process.env.DEPLOY_TARGET;

  if (buildMode === "dev") {
    throw new Error(
      "build mode is set to `dev`; are you sure you want to upload?"
    );
  }

  if (!["beta", "prod"].includes(buildMode)) {
    throw new Error(`Invalid build mode: ${buildMode}`);
  }

  const extensionId =
    buildMode === "prod"
      ? "abjpdpjdpbcnpflodcknkiebmnglgikp"
      : "lakppmaadogkmcbgpnaoakhlmdfcnnge";

  const store = chromeWebstoreUpload({
    extensionId: extensionId,
    clientId: process.env.UPLOAD_CLIENT_ID,
    clientSecret: process.env.UPLOAD_CLIENT_SECRET,
    refreshToken: process.env.UPLOAD_REFRESH_TOKEN,
  });

  const extension = fs.createReadStream("./extension.zip");

  // Response is a Resource Representation
  // https://developer.chrome.com/webstore/webstore_api/items#resource
  const res = await store.uploadExisting(extension);

  if (res.uploadState === "SUCCESS") {
    await store.publish();
    return;
  }

  console.debug("irregular response: ", res);

  if (
    res.itemError.map((err) => err.error_code).includes("ITEM_NOT_UPDATABLE")
  ) {
    throw new Error(
      "The item cannot be updated now because it is in pending review, ready to publish, or deleted status."
    );
  }
  throw new Error(
    `Upload state is not success :: Upload State: ${res.uploadState}`
  );
})();
