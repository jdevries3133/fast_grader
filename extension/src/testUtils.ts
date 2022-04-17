import { wildTest } from "./util";

export const defaultTabs: chrome.tabs.Tab[] = [
  {
    url: "https://facebook.com",
    id: 1,
    windowId: 2,
    active: true,
    index: 1,
    pinned: false,
    highlighted: true,
    incognito: false,
    selected: true,
    discarded: false,
    autoDiscardable: false,
    groupId: 1,
  },
  {
    url: "https://classroom.google.com/c/MzgxNTMyMDA3ODU5/a/MzE5ODM3MTMwNjQ4/submissions/by-status/and-sort-first-name/all",
    id: 2,
    windowId: 1,
    active: false,
    index: 2,
    pinned: false,
    highlighted: true,
    incognito: false,
    selected: true,
    discarded: false,
    autoDiscardable: false,
    groupId: 1,
  },
];

/**
 * A mock function factory that takes a list of chrome tabs and returns a
 * mock chrome.tabs.query function, which will return the subset of tabs
 * that match the critera passed to it.
 *
 * The returned mock function only mocks the promise-based version of
 * chrome.tabs.query.
 */
export function getMockTabQueryFunc(tabs: chrome.tabs.Tab[] = defaultTabs) {
  return async (tabAttrs: chrome.tabs.QueryInfo) => {
    const result: chrome.tabs.Tab[] = [];
    tabs.forEach((tab) => {
      Object.keys(tabAttrs).forEach((k: keyof chrome.tabs.QueryInfo) => {
        if (k === "url") {
          if (wildTest(tabAttrs[k] as string, tab[k])) {
            result.push(tab);
            return;
          }
        }
        const attr = (tab as any)[k];
        const targetAttr = tabAttrs[k];
        if (attr === targetAttr) {
          result.push(tab);
          return;
        }
      });
    });
    return result;
  };
}

export function getEvent(data: { [key: string]: string }): Event {
  let el = document.createElement("div");
  Object.keys(data).forEach((k) => {
    el.setAttribute(k, data[k]);
  });
  const event = <Event>(<unknown>{
    target: el,
  });
  return event;
}
