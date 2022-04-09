import { ContentMessageTypes, TabMsg } from "./messaging";
import { GradingSessionDetailResponse, logToBackend } from "./api";
import { wait } from "./util";

/**
 * If we can find the parent table, we are able to do the rest of the sync
 * operation
 */
async function isReady(): Promise<boolean> {
  try {
    await getParentTable();
    console.debug("pong");
    return true;
  } catch (e) {
    console.log(e);
    return false;
  }
}

/**
 * Return the table with all students in it.
 */
async function getParentTable(n_retries = 0): Promise<HTMLElement> {
  if (n_retries > 5) {
    throw new Error("cannot find parent table");
  }

  let possibleTables = document.querySelectorAll('[aria-label="Students"]');
  if (possibleTables.length === 0) {
    try {
      await wait(500);
      return await getParentTable(n_retries + 1);
    } catch (e) {
      const msg = "failed to get parent table";
      logToBackend(msg);
      throw new Error(msg);
    }
  }
  if (possibleTables.length === 1) {
    return <HTMLElement>possibleTables[0];
  }
  // fallthrough means we have an unexpected number of tables and need to
  // get word to the backend, because the extension is broken.
  const msg = [
    `expected zero or one tables, but received ${possibleTables.length}.`,
  ];
  try {
    // try to send string representations of the elements for additional context
    const stringRepresentations = [];
    for (let i = 1; i < possibleTables.length; i++) {
      const el = <HTMLElement>possibleTables[i].cloneNode(false);
      stringRepresentations.push(el.outerHTML);
    }
    msg.push(`tables: ${stringRepresentations.join(", ")}`);
  } catch (e) {}
  logToBackend(msg.join(", "));
  throw new Error(msg.join(" "));
}

async function getRows(
  parentTable: Element,
  retries: number = 0
): Promise<Array<HTMLElement>> {
  const rows = parentTable.querySelectorAll("tbody > tr");
  if (!rows.length) {
    console.debug("no rows visible yet");
    if (retries > 10)
      throw new Error("rows inside parent table could not be found");
    await wait(200);
    return await getRows(parentTable, retries + 1);
  }

  return <HTMLElement[]>(
    Array.from(rows).filter((row) => row.hasAttribute("data-student-id"))
  );
}

function parseRow(row: HTMLElement): {
  name: string;
  profilePhotoUrl: string;
  gradeInput: HTMLElement;
} {
  let name: string;
  let profilePhotoUrl: string;
  let gradeInput: HTMLElement;

  const nameEl: HTMLElement = row.querySelector("span");
  if (nameEl) {
    name = nameEl.innerHTML;
  }

  const profilePhotEl: HTMLElement = row.querySelector("img");
  if (profilePhotEl) {
    profilePhotoUrl = profilePhotEl.getAttribute("src");

    // profile photo has a resizing API parameter at the end which we will
    // remove to ensure it can be compared accurately with the sanitized url
    // coming from the backend
    const urlParamStart = profilePhotoUrl.indexOf("=s32-c");
    if (urlParamStart !== -1) {
      profilePhotoUrl = profilePhotoUrl.slice(0, urlParamStart);
    }
  }

  gradeInput = row.querySelector("td:nth-child(3) > div");

  return { name, profilePhotoUrl, gradeInput };
}

/**
 * Input the grade into the google classroom DOM following a multi-step
 * approach:
 *
 * 1. click the div to make the input element appear
 * 2. find the input element
 * 3. fill the input element with the value
 */
async function inputGradeValue(gradeInput: HTMLElement, gradeValue: Number) {
  console.debug(`putting grade ${gradeValue} into element`, gradeInput);
  // clicking the div causes the input to be injected
  gradeInput.click();

  // look for the input element to appear after clicking on the div
  let el: HTMLInputElement;
  while (!(el = gradeInput.querySelector("input"))) {
    await wait(1);
  }

  // it appears that there are two ticks involved in the animation. I assume
  // that when the input first appears, it might be disabled or maybe it gets
  // removed and re-added to the dom on the second animation tick. Either way,
  // we need to wait here until the whole animation completes
  await wait(100);

  // fill the input element with the value
  el.value = gradeValue.toString();
  console.debug("entered value", el.value);

  await wait(1);
}

async function syncAction(sessionData: GradingSessionDetailResponse) {
  const parentEl = await getParentTable();
  const rows = await getRows(parentEl);
  await wait(200);
  for (const row of rows) {
    const { name, profilePhotoUrl, gradeInput } = parseRow(row);

    // extract matching assignment submission from sessionData payload
    const matches = sessionData.submissions.filter((session) => {
      return (
        session.student_name == name &&
        session.profile_photo_url.includes(profilePhotoUrl)
      );
    });
    if (matches.length > 1) {
      logToBackend("more than one more match", null, {
        json: matches,
        domDump: true,
      });
      return;
    }

    if (!matches.length) continue;
    const match = matches[0];
    if (typeof match.grade !== "number") continue;

    await inputGradeValue(gradeInput, match.grade);
  }
}

/**
 * If the window is not focused, Google's javascript will not respond to our
 * DOM manipulation. In that case, instead of immediately triggering the
 * sync, we will wait for the focus event, and place a banner over the DOM
 * to show the user that we are waiting.
 */
async function syncSetup() {
  if (document.hasFocus()) {
    return;
  }

  // inject some UI to indicate that the user needs to focus the tab
  const el = document.createElement("div");
  el.setAttribute(
    "style",
    `display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      width: 100vw;
      height: 100vh;
      background-color: black;
      background-opacity: 50%`
  );
  el.innerHTML = `
      <div style="
      background-color: white;
      border-radius: 10px;
      box-shadow: 1px 1px 3px #444;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;">
        <h1 style="font-size: 4em;">Click to Sync Grades</h1>
      </div>
    `;
  document.body.appendChild(el);

  while (!document.hasFocus()) {
    await wait(100);
  }

  document.body.removeChild(el);
}

/**
 * Returns a boolean indicating success or failure, and handles exceptions
 * from the inner sync-related functions above
 */
async function performSync(
  sessionData: GradingSessionDetailResponse
): Promise<boolean> {
  try {
    await syncSetup();
    await syncAction(sessionData);
    return true;
  } catch (e) {
    logToBackend("sync failed due to unhandled error", e, {
      json: sessionData,
    });
    return false;
  }
}

async function handleMessage(msg: TabMsg, _?: any) {
  switch (msg.kind) {
    case ContentMessageTypes.SYNC:
      return performSync(msg.payload);
    case ContentMessageTypes.PING:
      return isReady();
  }
}

browser.runtime.onMessage.addListener(handleMessage);

export const exportedForTesting = {
  getParentTable,
  performSync,
  handleMessage,
  getRows,
  parseRow,
};
