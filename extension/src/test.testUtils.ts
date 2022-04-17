import { getMockTabQueryFunc } from "./testUtils";

describe("getMockTabQueryFunc", () => {
  const tabs: chrome.tabs.Tab[] = [
    {
      url: "https://facebook.com/",
      active: true,
      windowId: 1,
      id: 2,
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
      url: "https://facebook.com/foo/bar",
      active: true,
      windowId: 2,
      id: 2,
      index: 3,
      pinned: false,
      highlighted: true,
      incognito: false,
      selected: true,
      discarded: false,
      autoDiscardable: false,
      groupId: 1,
    },
    {
      url: "foo",
      active: false,
      windowId: 1,
      id: 1,
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
  const mockFunc = getMockTabQueryFunc(tabs);

  it("can filter tabs by windowId", async () => {
    const result = await mockFunc({ windowId: 1 });
    expect(result).toStrictEqual([
      {
        url: "https://facebook.com/",
        active: true,
        windowId: 1,
        id: 2,
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
        url: "foo",
        active: false,
        windowId: 1,
        id: 1,
        index: 2,
        pinned: false,
        highlighted: true,
        incognito: false,
        selected: true,
        discarded: false,
        autoDiscardable: false,
        groupId: 1,
      },
    ]);
  });
  it("can filter tab by index", async () => {
    const result = await mockFunc({ index: 1 });
    expect(result).toStrictEqual([
      {
        url: "https://facebook.com/",
        active: true,
        windowId: 1,
        id: 2,
        index: 1,
        pinned: false,
        highlighted: true,
        incognito: false,
        selected: true,
        discarded: false,
        autoDiscardable: false,
        groupId: 1,
      },
    ]);
  });
  it("uses wildcard search for urls", async () => {
    const result = await mockFunc({ url: "https://facebook.com/*" });
    expect(result).toStrictEqual([
      {
        url: "https://facebook.com/",
        active: true,
        windowId: 1,
        id: 2,
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
        url: "https://facebook.com/foo/bar",
        active: true,
        windowId: 2,
        id: 2,
        index: 3,
        pinned: false,
        highlighted: true,
        incognito: false,
        selected: true,
        discarded: false,
        autoDiscardable: false,
        groupId: 1,
      },
    ]);
  });
});
