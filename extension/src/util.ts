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

export async function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Test patterns with wildcards, vaguely reminscent of the web extension
 * match pattern implementation:
 * https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/sendMessage
 */
export function wildTest(wildcard: string, str: string): boolean {
  let w = wildcard.replace(/[.+^${}()|[\]\\]/g, "\\$&"); // regexp escape
  const re = new RegExp(`^${w.replace(/\*/g, ".*").replace(/\?/g, ".")}$`);
  return re.test(str);
}

/**
 * The sync tab is the target google classroom tab with the content script in
 * it. This will create the tab if it does not already exist, and focus the
 * tab no matter what.
 * ---
 * @param {string[]} urlPatterns an array of strings that can contain wildcards,
 * against which getSyncTab will filter. It follows the same rules as other
 * extension manifest match patterns:
 *
 * Docs:
 *  https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns
 *
 *
 * @param {string} concreteUrl the ideal target url. This will be searched against
 * too, but it will also be opened up if it does not already exist in any
 * tab or window.
 * ---
 */
export async function focusTab(
  urlPatterns: string[],
  concreteUrl: string
): Promise<chrome.tabs.Tab> {
  const searchPatterns = [...urlPatterns, concreteUrl];

  for (let i = 0; i < searchPatterns.length; i++) {
    const matches = await chrome.tabs.query({ url: searchPatterns[i] });
    if (matches.length) {
      const tab = matches[0];
      await chrome.windows.update(tab.windowId, { focused: true });
      await chrome.tabs.update(tab.id, { active: true });
      return tab;
    }
  }

  // fallthrough means that we need to create a new tab
  return await chrome.tabs.create({
    url: concreteUrl,
  });
}
