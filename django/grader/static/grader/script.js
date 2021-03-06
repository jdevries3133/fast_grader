//@ts-check

/**
 * Copyright (C) 2022 John DeVries
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

/****************************************************************************
 * globals and application state
 */

const state = {
  isInitialized: false,
  // the global shortcut listener is paused when we are recieving keyboard
  // input and don't want it to do anything
  shortcutListenerActive: true,

  // shift key inverts some commands
  shiftHeld: false,

  // recieved when we GET the data, used when we PATCH to update
  csrfToken: null,

  // index into assignmentData.submissions
  currentlyViewingIndex: 0,

  viewDiffOnly: false,

  // all google classroom data
  assignmentData: {
    pk: 1,
    // other misc data will get inserted here, like various id's, which will
    // ultimately be passed through to the backend
    submissions: [
      {
        // this placeholder object is what the UI will render while waiting
        // for a response, but it is a somewhat incomplete picture of the full
        // object coming back from the API. View the API data in the browsable
        // API at `/grader/assignment_data`
        pk: 1,
        student_name: "...",
        grade: null, // number!
        comment: "",
        submission: [""],
      },
    ],
  },
};

/****************************************************************************
 * utils
 */

function min(...args) {
  let ret = args[0];
  args.forEach((arg) => {
    if (arg < ret) {
      ret = arg;
    }
  });
  return ret;
}

async function wait(ms) {
  return new Promise((res) => {
    setTimeout(res, ms);
  });
}

/**
 * Hack to force a string to be copied.
 */
function copyStr(str) {
  return (" " + str).slice(1);
}

/**
 * Utility for getting the value of a cookie by name
 */
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

function getModal(containerElement, innerHTML) {
  const el = document.createElement(containerElement);
  el.classList.add(
    "transiton",
    "fixed",
    "w-full",
    "h-full",
    "top-0",
    "left-0",
    "flex",
    "items-center",
    "justify-center"
  );
  el.innerHTML = `
    <div class="container w-full h-full flex items-center flex-col justify-center">
        ${innerHTML}
    </div>
  `;
  return el;
}

/**
 * Helper to mark the current item unsynced.
 */
async function markUnSynced() {
  if (state.assignmentData.sync_state === "U") {
    return;
  }
  try {
    const postData = { ...state.assignmentData, sync_state: "U" };

    // we are updating the top-level resource; don't need to send the list
    // of submissions
    delete postData.submissions;
    await fetch(
      `/grader/session_viewset/${postData.pk}/?diff=${state.viewDiffOnly}`,
      {
        body: JSON.stringify(postData),
        method: "PATCH",
        headers: new Headers({
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        }),
      }
    );
  } catch (e) {
    console.error("failed to mark session as unsynced", e);
  }
}

/****************************************************************************
 * api & network requests
 */

/**
 * This actually fetches the list of submissions, which is a shallow
 * representation of only an array of pk's. hydrateSubmission() is where
 * fetching of individual AssignmentSubmission resources happens.
 */
async function fetchSession() {
  try {
    let res = await fetch("/grader/user_selections/");
    const choices = await res.json();
    res = await fetch(
      `/grader/session_viewset/${choices.selected_assignment}/`
    );
    return res.json();
  } catch (e) {
    console.error(e);
    indicateFailure(
      "Could not get grading session information. Please try again."
    );
  }
}

/**
 * fetch submission details as needed for the next 5 items in
 * state.assignmentData.submissions. If objects have already been fetched,
 * as indicated by the type of the item being an object and not a number,
 * it will not be fetched again.
 *
 * Initially, all of the members of state.assignmentData.submissions are
 * numbers, representing the pk for a given submission.
 *
 * @returns an array of promises for unresolved requests
 *
 */
async function getSubmissionDetails() {
  let i = state.currentlyViewingIndex;
  let LOOK_AHEAD = i + 4;
  const P = [];
  while (i < LOOK_AHEAD && i < state.assignmentData.submissions.length) {
    if (typeof state.assignmentData.submissions[i] === "number") {
      const pk = state.assignmentData.submissions[i];
      P.push({
        position: i,
        promise: fetch(
          `/grader/assignment_submission/${pk}/?diff=${state.viewDiffOnly}`
        ),
      });
    } else {
      // push a dummy promise as a placeholder, which will imediately resolve
      P.push({ position: i, promise: Promise.resolve("ALREADY_FETCHED") });
    }
    i++;
  }
  // we only await the first promise, which is the one that will be needed to
  // render the UI. The rest can take their time resolving.
  const res = await P[0].promise;
  if (typeof res !== "string") {
    if (res.ok) {
      state.assignmentData.submissions[state.currentlyViewingIndex] =
        await res.json();
    } else {
      const data = await res.json();
      if (data.message) {
        indicateFailure(data.message);
        return false;
      }
    }
  }
  return P.slice(1);
}

/**
 * Populate state.assignmentData.submissions
 */
async function initSubmissionData() {
  const removeLoading = indicateLoading();
  try {
    const data = await fetchSession();
    state.assignmentData = data;
    state.ready = true;
    const result = await getSubmissionDetails();
    if (result) {
      indicateSuccess("Your assignment data was loaded.");
    }
  } catch (e) {
    indicateFailure("Your assignment data failed to load; please try again!");
    console.error("Failed due to error: ", e);
  }
  removeLoading();
}

/**
 * Save the current submission object individually. Should be fired after
 * any change to ensure there are no out-of-sync changes.
 */
async function saveSubmission(retries = 0) {
  // race condition: while quickly moving through submissions, we might try
  // to save the submission before it is fetched, causing `pk` to be undefined,
  // and the submission resource not to be here in the first place.
  if (
    typeof state.assignmentData.submissions[state.currentlyViewingIndex] ===
    "number"
  ) {
    await wait(100);
    if (retries < 10) {
      return saveSubmission(retries + 1);
    } else {
      throw new Error("failed to save submission");
    }
  }

  // this could change while we await other stuff, so we'll grab out own copies
  // to make sure we are async safe
  const index = state.currentlyViewingIndex;
  const current = {
    ...state.assignmentData.submissions[index],
  };

  // no point in sending the submission content
  delete current.submission;

  const res = await fetch(
    `/grader/assignment_submission/${current.pk}/?diff=${state.viewDiffOnly}`,
    {
      body: JSON.stringify(current),
      method: "PATCH",
      headers: new Headers({
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
      }),
    }
  );
  const result = await res.json();
  state.assignmentData.submissions[index] = result;
}

/****************************************************************************
 * UI & DOM
 */

/*

/**
 * We aren't in happy react land anymore, so this will update the DOM, and we
 * can call it from other functions whenever we update the global state.
 */
async function updateView() {
  const current = state.assignmentData.submissions[state.currentlyViewingIndex];
  const progressEl = document.getElementById("grProgress");
  const nameEl = document.getElementById("grName");
  const gradeEl = document.getElementById("grGrade");
  const maxGradeEl = document.getElementById("grMaxGrade");
  const pagerEl = document.getElementById("studentContent");

  // if the assignment is ungraded, we will transform the whole grading
  // information container
  if (state.assignmentData.max_grade) {
    maxGradeEl.innerText = state.assignmentData.max_grade || "??";
    gradeEl.innerHTML = current?.grade?.toString() || "<i>No Grade</i>";
  } else {
    const gradeContainer = document.getElementById("gradeInfoContainer");
    gradeContainer.innerHTML = `
      <p class="italic text-gray-700">Ungraded Assignment</p>
    `;
  }

  progressEl.innerText = `${state.currentlyViewingIndex + 1}/${
    state.assignmentData.submissions.length
  }`;

  // if the current item is not defined, there is nothing more to do.
  if (!current) return;

  nameEl.innerText = current.student_name || "unknown";
  if (current.submission) {
    pagerEl.innerHTML = current.submission
      .map(
        (chunk) => `<code class="
      overflow-hidden
      overflow-clip
      break-word
      my-1
      block
      ${
        // coloring for diff view
        state.viewDiffOnly && chunk[0] === "+"
          ? "bg-dew-100 rounded"
          : chunk[0] === "-"
          ? "bg-red-100 rounded"
          : "rounded"
      }
    ">${chunk}</code>`
      )
      .join("");
  }
}

function removeBlur() {
  document.getElementById("toolContainer").classList.remove("blur-sm");
  document.getElementById("controlPanel").classList.remove("blur-sm");
}

function applyBlur() {
  document.getElementById("toolContainer").classList.add("blur-sm");
  document.getElementById("controlPanel").classList.add("blur-sm");
}

/**
 * Block the grading tool and indicate to the user that something is loading.
 *
 * @returns a function that will return the UI to the original state
 */
function indicateLoading() {
  state.shortcutListenerActive = false;
  const INDICATOR_ID = "loadingIndicator";
  function isIndicatorInDomAlready() {
    return !!document.getElementById(INDICATOR_ID);
  }
  if (isIndicatorInDomAlready()) {
    return () => {};
  }
  applyBlur();
  const innerHTML = `
  <div class="z-50 mb-4 p-4 rounded-lg bg-gray-200 shadow-lg">
    <h1>Please wait</h1>
    <div class="w-full flex items-center justify-center">
    <div id="loadingSpinner" class="lds-roller"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
    </div>
  </div>
  `;
  const container = getModal("div", innerHTML);
  container.id = INDICATOR_ID;
  document.body.appendChild(container);
  return () => {
    const el = document.getElementById(INDICATOR_ID);
    el && el.remove();
    removeBlur();
    state.shortcutListenerActive = true;
  };
}

/**
 * Add a banner indicating success, for network related things like saving
 * your session. Banner will auto-remove itself after three seconds.
 *
 */
function indicateSuccess(msg, clearAfterSeconds = 3) {
  const id = msg + Math.random();
  const statBar = document.getElementById("status");
  statBar.innerHTML = `
  ${statBar.innerHTML}
  <div id="${id}" class="m-1 lg:m-3 p-1 lg:p-3 bg-dew-200 rounded w-full flex flex-row items-center">
    <p class="text-md text-dew-900 flex-grow">
      Success: ${msg}
    </p>
    <button
      id="closeStatus"
      onClick="document.getElementById('${id}').remove();"
      class="text-lg text-black focus:ring hover:bg-red-200 p-2 bg-gray-300">
        x
      </button>
  </div>
  `;
  if (clearAfterSeconds) {
    setTimeout(() => {
      document.getElementById(id).remove();
    }, clearAfterSeconds * 1000);
  }
}

/**
 * Add a banner indicating failure, for network related things like saving
 * your session. Banner will auto-remove itself after three seconds.
 *
 */
function indicateFailure(msg, clearAfterSeconds = null) {
  const id = msg + Math.random();
  const statBar = document.getElementById("status");
  statBar.innerHTML = `
  <div id="${id}" class="m-1 lg:m-3 p-1 lg:p-3 bg-red-200 rounded w-full flex flex-row items-center">
    <p class="text-md text-dew-900 flex-grow">
      Failure: ${msg}
    </p>
    <button
      onClick="document.getElementById('${id}').remove();"
      id="closeStatus"
      class="text-lg text-black focus:ring hover:bg-red-200 bg-red-100 p-2">
        x
      </button>
  </div>
  `;
  if (clearAfterSeconds) {
    setTimeout(() => {
      document.getElementById("${id}").remove();
    }, clearAfterSeconds * 1000);
  }
}

/****************************************************************************
 * keyboard shortcuts
 */

/**
 * Every time the user types an number or backspace, it will be entered into
 * the grade "field".
 *
 * Note the tricky fact that the grade is represented as a number in state,
 * but naturally we treat it as both a string and a number in the midst of
 * this function:
 *
 * - string: the user hits backspace to remove the last character
 * - number: check if the grade is greater than the max grade
 * - number: disallow leading zeroes
 */
function handleGradeInput(char) {
  const current = state.assignmentData.submissions[state.currentlyViewingIndex];
  const originalGrade = current.grade;
  const curGradeStr = current.grade ? current?.grade?.toString() : "";
  // concatenate the input to the grade field, only if it is a number
  if (char !== "Backspace") {
    const value = parseInt(char);
    if (!isNaN(value)) {
      const newValue = parseInt(curGradeStr + value.toString());
      if (
        // prevent trailing zeroes by taking no action when there is no
        // current grade and the input character is zero
        (value === 0 && !curGradeStr) ||
        // only take action if the new value is less than the maximum possible
        // grade
        newValue <= state.assignmentData.max_grade
      ) {
        // set current.grade only if the newValue is valid.
        current.changed = true;
        current.grade = newValue;
      }
    }
  } else {
    // "backspace" the last number from the grade field
    if (curGradeStr.length <= 1) {
      current.changed = true;
      current.grade = 0;
    } else {
      current.changed = true;
      current.grade = parseInt(curGradeStr.slice(0, -1));
    }
  }
  // mark the item unsynced if the grade changed
  if (originalGrade !== current.grade) {
    markUnSynced();
  }
  updateView();
}

/**
 * Move to the next or previous student, depending on whether the shift key
 * is held:
 *    shift key held => move back
 *    no shift held  => move forward
 */
async function switchStudent() {
  let newIndex;
  switch (state.shiftHeld) {
    case false:
      newIndex = state.currentlyViewingIndex + 1;
      break;
    case true:
      newIndex = state.currentlyViewingIndex - 1;
      break;
  }
  if (newIndex >= 0 && newIndex < state.assignmentData.submissions.length) {
    const removeLoading = indicateLoading();

    // TODO(optimization): only save changed submissions
    saveSubmission();

    state.currentlyViewingIndex = newIndex;
    const promises = await getSubmissionDetails();
    updateView();
    removeLoading();
    if (!promises) return;

    // now that things are interactive again, resolve promises for the
    // look-ahead requests and put the data into state
    promises.forEach(async (item) => {
      const { position, promise } = item;
      const res = await promise;
      if (typeof res !== "string") {
        state.assignmentData.submissions[position] = await res.json();
      }
    });
  }
}

function giveFullGrade() {
  const current = state.assignmentData.submissions[state.currentlyViewingIndex];
  current.grade = state.assignmentData.max_grade;
  updateView();
}

/****************************************************************************
 * event handlers
 */

async function handleDiffSelectSlider() {
  const inputEl = document.getElementById("diffSelectInput");
  //@ts-ignore
  const newState = !inputEl.checked;
  state.viewDiffOnly = newState;
  //@ts-ignore
  inputEl.checked = newState;
  await initSubmissionData();
  updateView();
}

/**
 * Global switch listening to any and every key press to facilitate global
 * keyboard shortcuts.
 *
 * Only do anything if shortcutListenerActive is turned on. Other functions
 * can disable shortcuts when they are recieving text input, for example.
 */
function handleKeyPress(e) {
  // early exit if we are not listening for shortcuts
  if (!state.shortcutListenerActive) return;

  switch (e.key) {
    case "s":
      saveSubmission().then(() => {
        indicateSuccess("saved");
      });
      break;
    case "Enter":
      // next or prev student
      switchStudent();
      break;
    case ".":
      giveFullGrade();
      break;
    default:
      if (e.keyCode >= 48 && e.keyCode <= 71) {
        // number or backspace
        handleGradeInput(e.key);
      }
  }
}

/**
 * Shift key inverts some commands
 */
function handleKeyDown(e) {
  switch (e.key) {
    case "Shift":
      state.shiftHeld = true;
      break;
    case "Backspace":
      state.shortcutListenerActive && handleGradeInput(e.key);
      break;
  }
}

function handleKeyUp(e) {
  if (e.key === "Shift") {
    state.shiftHeld = false;
  }
}

/****************************************************************************
 * setup & initialization
 */

/**
 * Responds to the event that starts the application. Before the application
 * is started, there are some htmx elements on the page for settings
 * configuration
 */
async function init() {
  await initSubmissionData();
  updateView();

  document.body.addEventListener("keypress", handleKeyPress);
  document.body.addEventListener("keydown", handleKeyDown);
  document.body.addEventListener("keyup", handleKeyUp);
  document
    .getElementById("diffSelectSlider")
    .addEventListener("click", handleDiffSelectSlider);

  state.isInitialized = true;
}

document.body.addEventListener("startGrader", init);
