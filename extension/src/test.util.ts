import { gradingSessionDetail } from "./mockResponses";
import { getMockTabQueryFunc } from "./testUtils";
import { wait, wildTest, focusTab } from "./util";

test("wait", async () => {
  let foo = "bar";
  const CHANGE_FOO_AFTER = 5;
  setTimeout(() => (foo = "baz"), CHANGE_FOO_AFTER);

  // foo has not yet changed
  await wait(CHANGE_FOO_AFTER - 2);
  expect(foo).toBe("bar");

  // now, it has
  await wait(CHANGE_FOO_AFTER + 2);
  expect(foo).toBe("baz");
});

test("wildTest", () => {
  const cases = [
    {
      wild: "foo",
      str: "bar",
      res: false,
    },
    {
      wild: "f*o",
      str: "foo",
      res: true,
    },
    {
      wild: "?^&+..--*--.",
      str: "?^&+..--starishere--.",
      res: true,
    },
    {
      wild: "https://foo.com/bar/*/baz/buzz/",
      str: "https://foo.com/bar/u/0/baz/buzz/",
      res: true,
    },
    {
      wild: "*foo*",
      str: "bar",
      res: false,
    },
    {
      wild: "foo*",
      str: "fo",
      res: false,
    },
  ];
  cases.forEach(({ wild, str, res }) => {
    expect(wildTest(wild, str)).toBe(res);
  });
});

describe("findTab", () => {
  afterAll(() => {
    // restore default mock implementation
    browser.tabs.query.mockImplementation(getMockTabQueryFunc());
  });
  it("gets the correct tab for syncing", async () => {
    const tab = await focusTab(
      [
        "https://classroom.google.com/u/*/c/MzgxNTMyMDA3ODU5/a/MzE5ODM3MTMwNjQ4/submissions/by-status/and-sort-first-name/all",
      ],
      "https://classroom.google.com/c/MzgxNTMyMDA3ODU5/a/MzE5ODM3MTMwNjQ4/submissions/by-status/and-sort-first-name/all"
    );
    expect(tab).toStrictEqual({
      active: false,
      id: 2,
      url: "https://classroom.google.com/c/MzgxNTMyMDA3ODU5/a/MzE5ODM3MTMwNjQ4/submissions/by-status/and-sort-first-name/all",
      windowId: 1,
    });
  });
  it("switches to the correct tab if the current one is wrong", async () => {
    await focusTab(
      [
        "https://classroom.google.com/u/*/c/MzgxNTMyMDA3ODU5/a/MzE5ODM3MTMwNjQ4/submissions/by-status/and-sort-first-name/all",
      ],
      "https://classroom.google.com/c/MzgxNTMyMDA3ODU5/a/MzE5ODM3MTMwNjQ4/submissions/by-status/and-sort-first-name/all"
    );
    expect(browser.tabs.update).toHaveBeenCalledWith(2, { active: true });
  });

  it("opens a new tab if there is not one already open", async () => {
    browser.tabs.query.mockImplementation(
      getMockTabQueryFunc([
        {
          url: "https://facebook.com/",
          id: 1,
          windowId: 2,
          active: true,
        },
      ])
    );
    await focusTab(
      [
        "https://classroom.google.com/u/*/c/MzgxNTMyMDA3ODU5/a/MzE5ODM3MTMwNjQ4/submissions/by-status/and-sort-first-name/all",
      ],
      "https://classroom.google.com/c/MzgxNTMyMDA3ODU5/a/MzE5ODM3MTMwNjQ4/submissions/by-status/and-sort-first-name/all"
    );
    expect(browser.tabs.create).toHaveBeenCalledWith({
      url: "https://classroom.google.com/c/MzgxNTMyMDA3ODU5/a/MzE5ODM3MTMwNjQ4/submissions/by-status/and-sort-first-name/all",
    });
  });
});
