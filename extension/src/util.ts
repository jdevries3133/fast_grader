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
 *
 * ---
 * @param {urlPattern} string[] an array of strings that can contain wildcards,
 * against which getSyncTab will filter. It follows the same rules as other
 * extension manifest match patterns:
 *
 * Docs:
 *  https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns
 *
 *
 * @param {concreteUrl} string the ideal target url. This will be searched against
 * too, but it will also be opened up if it does not already exist in any
 * tab or window.
 * ---
 */
export async function focusTab(
  urlPatterns: string[],
  concreteUrl: string
): Promise<Tab> {
  const searchPatterns = [...urlPatterns, concreteUrl];

  for (let i = 0; i < searchPatterns.length; i++) {
    const matches = await browser.tabs.query({ url: searchPatterns[i] });
    if (matches.length) {
      const tab = matches[0];
      await browser.windows.update(tab.windowId, { focused: true });
      await browser.tabs.update(tab.id, { active: true });
      return tab;
    }
  }

  // fallthrough means that we need to create a new tab
  return await browser.tabs.create({
    url: concreteUrl,
  });
}
