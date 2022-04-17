import { applyPatch } from "./vendor/macWorkaround";
import { getTokenMsg, performSyncMsg } from "./messaging";
import { BACKEND_BASE_URL } from "./constants";

/**
 * Indicate to the user that the sync action did not succeed
 */
function syncFailed() {
  const el = document.createElement("div");
  el.innerHTML = '<p id="failMsg">Sync failed. Please try again</p>';
  document.body.appendChild(el);
}

function syncRequestHandler(e: Event) {
  if (!(e.target instanceof Element)) {
    syncFailed();
    return;
  }
  const pk = e.target.getAttribute("data-pk");
  return performSyncMsg(pk);
}

function haltSync() {}

function openClassFast() {
  chrome.tabs.create({
    url: BACKEND_BASE_URL,
  });
}

function resumeGrading(e: Event) {
  if (!(e.target instanceof HTMLElement)) {
    return;
  }
  const pk = e.target.getAttribute("data-pk");
  chrome.tabs.create({
    url: `${BACKEND_BASE_URL}/grader/${pk}/`,
  });
}

function viewOnSite(e: Event) {
  if (!(e.target instanceof HTMLElement)) {
    return;
  }
  const pk = e.target.getAttribute("data-pk");
  chrome.tabs.create({
    url: `${BACKEND_BASE_URL}/grader/session/${pk}/`,
  });
}

/**
 * Apparently content-security policies are so DAMN psychophantic that they
 * won't allow anything fun or dynamic. Instead, we register all the event
 * listeners that will eventually listen for something in the DOM below. After
 * every swap, we attach listeners for anything that has arrived in the DOM.
 *
 * The third argument to addEventListener is useCapture. That means that the
 * first event listener will capture the event and stop its' propagation.
 * This helps in case we leak a listener by accident.
 */
const eventRegistry: Array<{
  selector: string;
  handler: EventListener;
  event: keyof HTMLElementEventMap;
}> = [
  {
    selector: ".syncSessionButton",
    handler: syncRequestHandler,
    event: "click",
  },
  {
    selector: "#exitLoading",
    handler: haltSync,
    event: "click",
  },
  {
    selector: ".openClassFast",
    handler: openClassFast,
    event: "click",
  },
  {
    selector: "#resumeGrading",
    handler: resumeGrading,
    event: "click",
  },
  {
    selector: "#viewOnSite",
    handler: viewOnSite,
    event: "click",
  },
];

// update event listeners and eventRegistry on every htmx:afterSwap event
document.body.addEventListener("htmx:afterSwap", () => {
  eventRegistry.forEach(({ selector, handler, event }) => {
    // add event listener
    const els = document.querySelectorAll(selector);
    if (els.length !== 0) {
      els.forEach((el: HTMLElement) => {
        if (el.getAttribute("listener-bound") !== "true") {
          el.addEventListener(event, handler);
        }
        el.setAttribute("listener-bound", "true");
      });
    }
  });
});

let AUTH_TOKEN: string = "";
getTokenMsg()
  .then((tok) => (AUTH_TOKEN = tok))
  .catch((e) => console.error(e));

document.body.addEventListener(
  "htmx:configRequest",
  (event: CustomEvent<HtmxEventDetail>) => {
    event.detail.headers["Authorization"] = `Token ${AUTH_TOKEN}`;
    event.detail.headers["Accept"] = "text/html";
  }
);

document.addEventListener("DOMContentLoaded", () => {
  applyPatch();
});

export const exportedForTesting = {
  syncRequestHandler,
};
