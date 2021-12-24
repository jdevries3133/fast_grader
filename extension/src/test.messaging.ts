import {
  BackgroundMessageTypes,
  RuntimeMsg,
  getTokenMsg,
  getNewTokenMsg,
  performSyncMsg,
} from "./messaging";

jest.mock("./messaging", () => {
  const original = jest.requireActual("./messaging");
  return {
    ...original,
    _pingContentScript: jest.fn(),
  };
});

describe("messaging methods", () => {
  test("getTokenMsg", async () => {
    const expectedMsg: RuntimeMsg = {
      kind: BackgroundMessageTypes.GET_TOKEN,
    };
    await getTokenMsg();
    expect(browser.runtime.sendMessage).toHaveBeenCalledWith(null, expectedMsg);
  });
  test("getNewTokenMsg", async () => {
    const expectedMsg: RuntimeMsg = {
      kind: BackgroundMessageTypes.CLEAR_TOKEN,
    };
    await getNewTokenMsg();
    expect(browser.runtime.sendMessage).toHaveBeenCalledWith(null, expectedMsg);
  });
  test("performSyncMsg", async () => {
    const expectedMsg: RuntimeMsg = {
      kind: BackgroundMessageTypes.PERFORM_SYNC,
      payload: { pk: "23" },
    };
    await performSyncMsg(expectedMsg.payload.pk);
    expect(browser.runtime.sendMessage).toHaveBeenCalledWith(null, expectedMsg);
  });
});
