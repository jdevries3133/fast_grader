import { GradingSessionDetailResponse } from "./api";
import { wait } from "./util";
import { tabMessage, runtimeMessage } from "./chromeWrappers";

/**
 * Messages received from the background script
 */
export enum BackgroundMessageTypes {
  GET_TOKEN,
  CLEAR_TOKEN,
  PERFORM_SYNC,
}

/**
 * Messages received by the content script
 */
export enum ContentMessageTypes {
  PING,
  SYNC,
}

export type RuntimeMsg = {
  kind: BackgroundMessageTypes;
  payload?: any;
};

export type TabMsg = {
  kind: ContentMessageTypes;
  payload?: any;
};

export async function getTokenMsg(): Promise<string> {
  return runtimeMessage({ kind: BackgroundMessageTypes.GET_TOKEN });
}

export async function getNewTokenMsg(): Promise<string> {
  return runtimeMessage({ kind: BackgroundMessageTypes.CLEAR_TOKEN });
}

export async function performSyncMsg(pk: string): Promise<boolean> {
  return runtimeMessage({
    payload: { pk },
    kind: BackgroundMessageTypes.PERFORM_SYNC,
  });
}

export function beginContentScriptSyncMsg(
  data: GradingSessionDetailResponse,
  tabId: number
) {
  const msg: TabMsg = {
    kind: ContentMessageTypes.SYNC,
    payload: data,
  };
  return tabMessage(tabId, msg);
}

async function _pingContentScript(tabId: number): Promise<boolean> {
  try {
    return await tabMessage(tabId, { kind: ContentMessageTypes.PING });
  } catch (e) {
    // we expect errors here, because we're polling until the content script
    // gives a response
    console.debug(
      "expected error occured and was handled: ",
      e,
      chrome.runtime.lastError.message
    );
    return false;
  }
}

export async function contentScriptReady(
  tabId: number,
  retries: number = 0
): Promise<boolean> {
  console.debug(`retry content script for ${retries}th time`);
  const RETRY_INTERVAL = 500; // ms
  const MAX_RETRIES = 5;
  const result = await _pingContentScript(tabId);
  if (result) {
    return true;
  }
  await wait(RETRY_INTERVAL);
  if (retries > 5) {
    throw new Error(
      `content script did not prepare itself within ${
        RETRY_INTERVAL * MAX_RETRIES
      }ms`
    );
  }
  return await contentScriptReady(tabId, retries + 1);
}
