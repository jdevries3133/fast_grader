import {
  GradingSessionDetailResponse,
  logToBackend,
  backendRequest,
  SyncStates,
} from "./api";
import { BACKEND_BASE_URL } from "./constants";
import {
  BackgroundMessageTypes,
  RuntimeMsg,
  beginContentScriptSyncMsg,
  contentScriptReady,
} from "./messaging";
import { focusTab } from "./util";

/**
 * Any exported functions in this module should be guarded by this, because
 * they cannot be called outside the background script context.
 */
export function inBackgroundScript() {
  try {
    return "ServiceWorkerGlobalScope" in global;
  } catch (e) {
    // getBackgroundPage() cannot be used in private windows and apparently
    // some other content script contexts, but it always works in the background
    // page, so this extra exception handler ensures that we always provide
    // an accurate answer
    if (
      e.message.includes(
        "browser.extension.getBackgroundPage is not a function"
      )
    ) {
      console.debug(
        "presumably not in background script because getBackgroundPage is not a function"
      );
    } else {
      console.error(e);
    }
    return false;
  }
}

/**
 * checks localStorage for a token, or calls the login function to get one.
 */
export async function fetchToken(): Promise<string> {
  if (!inBackgroundScript()) {
    throw new Error("cannot call this method outside the background script");
  }
  try {
    const result = await chrome.storage.sync.get("token");
    let tok: string | undefined = result?.token;
    if (!tok) {
      tok = await login();
      chrome.storage.sync.set({ token: tok });
    }
    return tok;
  } catch (e) {
    logToBackend("failed to get token", e, { associateUser: false });
    return "";
  }
}

/**
 * Remove the localStorage token, which must be done, for example, in cases
 * where the token causes a 403 error.
 */
async function clearToken() {
  try {
    return chrome.storage.sync.remove("token");
  } catch (e) {
    logToBackend("failed to remove token", e, { associateUser: false });
  }
}

/**
 * returns an access key for our API, derived from the user's oauth access
 * token.
 */
async function login(nRetries = 0): Promise<string> {
  if (global.chrome === undefined) {
    logToBackend("chrome API is not present", null, { associateUser: false });
    return "";
  }
  return new Promise(async (resolve) => {
    chrome.identity.getAuthToken(
      {
        interactive: true,
      },
      async (token) => {
        if (chrome.runtime.lastError?.message) {
          logToBackend(
            `error while getting oauth token: ${chrome.runtime.lastError.message}`,
            null,
            { associateUser: false }
          );
          resolve(null);
        }
        if (token === null || token === undefined) {
          logToBackend(
            "chrome identity api called callback with null or undefined token",
            null,
            { associateUser: false }
          );
          resolve(null);
        }
        try {
          // we intentionally cannot call api.backendRequest because
          // it depends on this function to provide the token
          const res = await fetch(
            `${BACKEND_BASE_URL}/accounts/dj_rest_auth/google/`,
            {
              method: "POST",
              body: JSON.stringify({ access_token: token }),
              headers: {
                "Content-Type": "application/json",
              },
            }
          );
          const jsn = await res.json();
          resolve(jsn.key);
        } catch (e) {
          if (nRetries < 5) {
            return login();
          } else {
            resolve(null);
          }
        }
      }
    );
  });
}

/**
 * Focus the user on the correct tab or create a new one such that they can
 * see the assignment they want to sync. await a ping from the content
 * script to confirm its readiness.
 */
async function prepareToSync(data: GradingSessionDetailResponse) {
  // first, try to find an existing tab we can switch to. We want to check
  // both the explicit UI url from the Classroom API, but also have the
  // flexibility to detect the `/u/<number>/` portion of google's url
  // patterns.
  const userUrlPattern = data.google_classroom_detail_view_url.replace(
    "/c/",
    "/u/*/c/"
  );
  const tab = await focusTab(
    [
      userUrlPattern,
      userUrlPattern.replace("/all", "/*"),
      data.google_classroom_detail_view_url.replace("/all", "/*"),
    ],
    data.google_classroom_detail_view_url
  );
  return tab;
}

/**
 * After a successful response from the content script, send a PATCH request
 * to the backend to mark this grading session as synced.
 */
async function markSynced(gradingSessionData: GradingSessionDetailResponse) {
  backendRequest(`/grader/session_viewset/${gradingSessionData.pk}/`, "PATCH", {
    sync_state: SyncStates.SYNCED,
  });
}

async function _unsafePerformSync(pk: string) {
  const res = await backendRequest(`/grader/deep_session/${pk}/`);
  const gradingSessionData = <GradingSessionDetailResponse>await res.json();
  const tab = await prepareToSync(gradingSessionData);
  await contentScriptReady(tab.id);
  const result = await beginContentScriptSyncMsg(gradingSessionData, tab.id);
  if (result) {
    markSynced(gradingSessionData);
  }
}

async function performSync(pk: string): Promise<boolean> {
  try {
    await _unsafePerformSync(pk);
    return true;
  } catch (e) {
    logToBackend("sync failed due to error", e);
    return false;
  }
}

function handleMessage(
  msg: RuntimeMsg,
  _: any,
  sendResponse: (response: any) => void
) {
  (async () => {
    switch (msg.kind) {
      case BackgroundMessageTypes.GET_TOKEN:
        sendResponse(await fetchToken());
        break;
      case BackgroundMessageTypes.CLEAR_TOKEN:
        await clearToken();
        sendResponse(await fetchToken());
        break;
      case BackgroundMessageTypes.PERFORM_SYNC:
        sendResponse(await performSync(msg.payload.pk));
        break;
    }
  })();
  return true;
}

// allows the content script to import from this module without registering
// a duplicate listener in another part of the extension
if (inBackgroundScript()) {
  chrome.runtime.onMessage.addListener(handleMessage);
}

export const exportedForTesting = {
  performSync,
  _unsafePerformSync,
};
