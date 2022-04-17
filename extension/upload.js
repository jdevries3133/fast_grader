const fs = require("fs");

const { chromeWebstoreUpload } = require("chrome-webstore-upload");
const dotenv = require("dotenv");

dotenv.config();

const buildMode = process.env.DEPLOY_TARGET;

if (buildMode === "dev") {
  throw new Error(
    "build mode is set to `dev`; are you sure you want to upload?"
  );
}

if (["beta", "prod"].includes(buildMode)) {
  throw new Error(`Invalid build mode: ${buildMode}`);
}

const extensionId =
  process.ENV.DEPLOY_TARGET === "production"
    ? "abjpdpjdpbcnpflodcknkiebmnglgikp"
    : "lakppmaadogkmcbgpnaoakhlmdfcnnge";

const store = chromeWebstoreUpload({
  extensionId: extensionId,
  clientSecret: process.ENV.UPLOAD_CLIENT_SECRET,
  refreshToken: process.ENV.UPLOAD_REFRESH_TOKEN,
});

const extension = fs.createReadStream("./extension.zip");

store.uploadExisting(extension).then((res) => {
  // Response is a Resource Representation
  // https://developer.chrome.com/webstore/webstore_api/items#resource
  if (res.uploadState === "SUCCESS") {
    store.publish();
    return;
  }

  console.log(res);
  throw new Error(
    `Upload state is not success :: Upload State: ${uploadState}`
  );
});
