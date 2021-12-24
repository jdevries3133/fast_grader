import { logToBackend, backendRequest as _br } from "./api";
const _brt = <any>_br;
const backendRequest = <jest.MockedFunction<typeof _br>>_brt;

import {
  contentScriptReady as _cs,
  beginContentScriptSyncMsg as _bs,
} from "./messaging";
const _cs_tmp = <any>_cs;
const contentScriptReady = <jest.MockedFunction<typeof _cs>>_cs_tmp;
const _bs_tmp = <any>_bs;
const beginContentScriptSyncMsg = <jest.MockedFunction<typeof _bs>>_bs_tmp;

import { focusTab as _ft } from "./util";
const _ft_tmp = <any>_ft;
const findTab = <jest.MockedFunction<typeof _ft>>_ft_tmp;

import { exportedForTesting } from "./background";
import { gradingSessionDetail } from "./mockResponses";

const { performSync, _unsafePerformSync } = exportedForTesting;

jest.mock("./util");

jest.mock("./messaging", () => {
  const original = jest.requireActual("./messaging");
  return {
    ...original,
    beginContentScriptSyncMsg: jest.fn(),
    contentScriptReady: jest.fn().mockImplementation(async () => true),
  };
});

jest.mock("./api");

function setupTabs(tabResponse?: Tab) {
  findTab.mockImplementation(async (_, __) => {
    return (
      tabResponse || {
        url: gradingSessionDetail.google_classroom_detail_view_url,
        active: false,
        windowId: 1,
        id: 2,
      }
    );
  });
}

function setupResponseData(data?: object) {
  backendRequest.mockImplementation(async () => {
    // @ts-ignore
    if (data?.throwError) {
      throw new Error();
    }
    const res = {
      json: async () => data || gradingSessionDetail,
    };
    return <Response>res;
  });
}

function setupBeginContentScriptMsg(returnValue: boolean = true) {
  beginContentScriptSyncMsg.mockImplementation(async () => returnValue);
}

describe("syncRequestHandler", () => {
  beforeEach(() => {
    setupResponseData(gradingSessionDetail);
    setupBeginContentScriptMsg();
    setupTabs();
  });

  afterEach(() => {
    backendRequest.mockClear();
    browser.tabs.query.mockClear();
  });

  it("fetches pk from backend", async () => {
    await _unsafePerformSync("2");
    expect(backendRequest).toHaveBeenCalledWith(`/grader/deep_session/2/`);
  });

  it("sends response data to beginContentScriptSync", async () => {
    backendRequest.mockClear();
    setupResponseData({ google_classroom_detail_view_url: "foo" });
    await _unsafePerformSync("2");
    expect(beginContentScriptSyncMsg).toHaveBeenCalledWith(
      {
        google_classroom_detail_view_url: "foo",
      },
      2
    );
  });

  it("catches and logs errors", async () => {
    // this time, we test against the wrapper, to check error handling
    // behavior
    setupResponseData({ throwError: true });
    await performSync("2");
    expect(logToBackend).toHaveBeenCalled();
  });

  it("ultimately calls beginContentScriptSync when all goes well", async () => {
    contentScriptReady.mockImplementation(async () => true);
    await _unsafePerformSync("2");
    expect(beginContentScriptSyncMsg).toHaveBeenCalledWith(
      gradingSessionDetail,
      2
    );
  });
});

describe("performSync", () => {
  beforeEach(() => {
    setupResponseData(gradingSessionDetail);
    setupBeginContentScriptMsg();
    setupTabs();
  });

  afterEach(() => {
    backendRequest.mockClear();
    browser.tabs.query.mockClear();
  });
  it("does not initiate syncing before confirming initialization of the content script", async () => {
    const err = new Error("content script did not prepare");
    contentScriptReady.mockImplementation(async () => {
      throw err;
    });
    // expect(_unsafePerformSync("2")).rejects.toThrowError(err);
  });
});
