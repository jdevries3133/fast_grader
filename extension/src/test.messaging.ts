import { runtimeMessage } from "./chromeWrappers";
import {
  BackgroundMessageTypes,
  RuntimeMsg,
  getTokenMsg,
  getNewTokenMsg,
  performSyncMsg,
} from "./messaging";

jest.mock("./chromeWrappers");

describe("messaging methods", () => {
  test("getTokenMsg", async () => {
    await getTokenMsg();
    expect(runtimeMessage).toHaveBeenCalledWith({ kind: 0 });
  });
  test("getNewTokenMsg", async () => {
    await getNewTokenMsg();
    expect(runtimeMessage).toHaveBeenCalledWith({ kind: 1 });
  });
  test("performSyncMsg", async () => {
    const expectedMsg: RuntimeMsg = {
      kind: BackgroundMessageTypes.PERFORM_SYNC,
      payload: { pk: "23" },
    };
    await performSyncMsg(expectedMsg.payload.pk);
    expect(runtimeMessage).toHaveBeenCalledWith({
      kind: 2,
      payload: { pk: "23" },
    });
  });
});
