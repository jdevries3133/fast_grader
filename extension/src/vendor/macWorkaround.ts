/* istanbul ignore next */
export async function applyPatch() {
  /**
   * Temporary workaround for secondary monitors on MacOS where redraws don't happen
   * @See https://bugs.chromium.org/p/chromium/issues/detail?id=971701
   */
  const info = await new Promise<chrome.runtime.PlatformInfo>((res) => {
    chrome.runtime.getPlatformInfo((info) => {
      res(info);
    });
  });
  if (info.os === "mac") {
    const fontFaceSheet = new CSSStyleSheet();
    fontFaceSheet.insertRule(`
        @keyframes redraw {
          0% {
            opacity: 1;
          }
          100% {
            opacity: .99;
          }
        }
      `);
    fontFaceSheet.insertRule(`
        html {
          animation: redraw 1s linear infinite;
        }
      `);
    // @ts-ignore
    const existingSheets = [...document?.adoptedStyleSheets];
    // @ts-ignore
    document.adoptedStyleSheets = [...existingSheets, fontFaceSheet];
  }
}
