/**
 * Copyright (C) 2022 John DeVries
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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
