import { wildTest } from "./util";

export const defaultTabs: Tab[] = [
  {
    url: "https://facebook.com",
    id: 1,
    windowId: 2,
    active: true,
  },
  {
    url: "https://classroom.google.com/c/MzgxNTMyMDA3ODU5/a/MzE5ODM3MTMwNjQ4/submissions/by-status/and-sort-first-name/all",
    id: 2,
    windowId: 1,
    active: false,
  },
];

export function getMockTabQueryFunc(tabs: Tab[] = defaultTabs) {
  return async (tabAttrs: Partial<Tab>) => {
    const result: Tab[] = [];
    tabs.forEach((tab) => {
      Object.keys(tabAttrs).forEach((k: keyof Tab) => {
        if (k === "url") {
          if (wildTest(tabAttrs[k], tab[k])) {
            result.push(tab);
            return;
          }
        }
        if (tab[k] === tabAttrs[k]) {
          result.push(tab);
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
