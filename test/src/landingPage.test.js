beforeEach(async () => {
  await Promise.all([page.goto(buildUrl("/")), page.waitForNavigation()]);
});

test("page has hero text", async () => {
  const html = await page.$eval(
    '[data-testid="hero text"',
    (el) => el.innerHTML
  );
  expect(html).toContain("give more feedback");
  expect(html).toContain("be data driven");
  expect(html).toContain("do more grading");
  expect(html).toContain("in less time");
});

test("video is present and autoplays", async () => {
  const isPaused = await page.$eval("video", (el) => !el.paused);
  expect(isPaused).toBe(false);
});
