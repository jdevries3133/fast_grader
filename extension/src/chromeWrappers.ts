/**
 * Minimal wrappers around chrome APIs.
 */

import { RuntimeMsg, TabMsg } from "./messaging";

export async function tabMessage(tabId: number, msg: TabMsg): Promise<any> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, msg, (response) => resolve(response));
  });
}

export async function runtimeMessage(msg: RuntimeMsg): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(chrome.runtime.id, msg, (response) => {
      if (typeof response === "string") {
        resolve(response);
      } else {
        reject();
      }
    });
  });
}
