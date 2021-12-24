import { exportedForTesting } from "./popup";
import { getEvent } from "./testUtils";

import { performSyncMsg as _ps } from "./messaging";
const _ps_tmp = <any>_ps;
const performSyncMsg = <jest.MockedFunction<typeof _ps>>_ps_tmp;

const { syncRequestHandler } = exportedForTesting;

jest.mock("./messaging", () => {
  const orig = jest.requireActual("./messaging");
  return {
    ...orig,
    performSyncMsg: jest.fn(),
  };
});

test("syncRequestHandler calls performSync with data-pk value", () => {
  [
    "2",
    "3",
    // does not validate that data-pk is number-like, or pass it through
    // parseInt
    "foobar",
  ].forEach((value) => {
    syncRequestHandler(getEvent({ "data-pk": value }));
    expect(performSyncMsg).toHaveBeenCalledWith(value);
  });
});

test("syncRequestHandler calls syncFailed if arg is not an element", () => {
  const evt = <Event>(<unknown>{
    target: "not an element",
  });
  syncRequestHandler(evt);
  const el = document.querySelector("#failMsg");
  expect(el).toHaveTextContent("Sync failed. Please try again");
});
