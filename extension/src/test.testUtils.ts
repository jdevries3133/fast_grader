import { getMockTabQueryFunc } from "./testUtils";

test("getMockTabQueryFunc", async () => {
  const tabs: Tab[] = [
    {
      url: "https://facebook.com/",
      active: true,
      windowId: 1,
      id: 2,
    },
    {
      url: "foo",
      active: false,
      windowId: 1,
      id: 1,
    },
  ];
  const func = getMockTabQueryFunc(tabs);
  expect(await func({ windowId: 1 })).toStrictEqual([
    {
      url: "https://facebook.com/",
      active: true,
      windowId: 1,
      id: 2,
    },
    {
      url: "foo",
      active: false,
      windowId: 1,
      id: 1,
    },
  ]);
  expect(await func({ id: 2 })).toStrictEqual([
    {
      url: "https://facebook.com/",
      active: true,
      windowId: 1,
      id: 2,
    },
  ]);
});
