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
