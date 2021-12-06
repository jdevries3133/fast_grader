/**
 * Copyright (C) 2021 John DeVries
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
    // other misc data will get inserted here, like various id's, which will
    // ultimately be passed through to the backend
    submissions: [
      {
        // this placeholder object is what the UI will render while waiting
        // for a response, but it is a somewhat incomplete picture of the full
        // object coming back from the API. View the API data in the browsable
        // API at `/grader/assignment_data`
        student_name: "...",
        grade: null, // number!
        comment: null,
        submission: "",
        assignment: {
          max_grade: 75,
          teacher_template: null,
        },
      },
    ],
  },

  commentBank: {
    registers: {
      // comments in each comment bank register will be stored here
    },
    prefixKey: {
      value: "",
      choices: {
        normalMode: "b",
        editMode: "B",
        noPrefix: "",
      },
    },
  },
};

/****************************************************************************
 * utils
 */

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
    <div class="modal-overlay blur-sm absolute w-full h-full bg-gray-900 opacity-50"></div>
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
    await fetch(`/grader/session_viewset/${postData.pk}/`, {
      body: JSON.stringify(postData),
      method: "PATCH",
      headers: new Headers({
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
      }),
    });
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
 * Get the detailed submission resource for the current submission.
 */
async function getSubmissionDetails() {
  const removeLoading = indicateLoading();
  // be flexible depending on whether this slot in the array is literally just
  // the pk, or it looks more like { pk: number }
  let pk = state.assignmentData.submissions[state.currentlyViewingIndex];
  if (typeof pk !== "number" && "pk" in pk) {
    let { pk } = pk;
  }
  const res = await fetch(`/grader/assignment_submission/${pk}/`);
  if (res.ok) {
    state.assignmentData.submissions[state.currentlyViewingIndex] =
      await res.json();
    removeLoading();
  } else {
    removeLoading();
    indicateFailure(
      "Could not get details for this submission. Please try again."
    );
  }
}

/**
 * Wrapper around getSubmissionDetails which checks if the detailed submission
 * resource has been fetched. After the main init function, items in the array
 * `state.assignmentData.submissions` will look like this:
 *   [
 *     { pk: number },
 *     ...
 *   ]
 *
 * Therefore, this function checks for the presence of the other fields:
 * - `student_name`
 * - `grade`
 * - `comment`
 * - `submission` (text content)
 * - etc.
 *
 * If required fields are absent, `getSubmissionDetails` is fired, which
 * will get the full detailed resource from the backend.
 */
async function checkSubmissionDetails() {
  const submission_fields = [
    "pk",
    "api_student_profile_id",
    "api_student_submission_id",
    "profile_photo_url",
    "submission",
    "student_name",
    "grade",
    "comment",
  ];
  for (const field of submission_fields) {
    if (
      typeof state.assignmentData.submissions[state.currentlyViewingIndex] ===
        "number" ||
      !(field in state.assignmentData.submissions[state.currentlyViewingIndex])
    ) {
      return getSubmissionDetails();
    }
  }
}

/**
 * Populate state.assignmentData.submissions
 */
async function updateStateWithData() {
  const removeLoading = indicateLoading();
  try {
    const data = await fetchSession();
    state.assignmentData = data;
    state.ready = true;
    await checkSubmissionDetails();
    indicateSuccess("Your assignment data was loaded.");
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
async function saveSubmission() {
  // this could change while we await other stuff, so we'll grab out own copies
  // to make sure we are async safe
  const index = state.currentlyViewingIndex;
  const current = {
    ...state.assignmentData.submissions[index],
  };

  // no point in sending the submission content
  delete current.submission;

  const res = await fetch(`/grader/assignment_submission/${current.pk}/`, {
    body: JSON.stringify(current),
    method: "PATCH",
    headers: new Headers({
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken"),
    }),
  });
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
  const commentEl = document.getElementById("grComment");
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
  nameEl.innerText = current.student_name || "unknown";
  commentEl.innerHTML = current.comment || "<i>No Comment</i>";
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
          ? "bg-green-100 rounded"
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
  const container = document.getElementById("toolContainer");
  container.classList.remove("blur-sm");
}

function applyBlur() {
  const container = document.getElementById("toolContainer");
  container.classList.add("blur-sm");
}

/**
 * Block the grading tool and indicate to the user that something is loading.
 *
 * @returns a function that will return the UI to the original state
 */
function indicateLoading() {
  const INDICATOR_ID = "loadingIndicator";
  function isIndicatorInDomAlready() {
    return !!document.getElementById(INDICATOR_ID);
  }
  if (isIndicatorInDomAlready()) {
    return () => {};
  }
  applyBlur();
  const innerHTML = `
  <div class="z-50 mb-4 p-4 rounded-lg bg-gray-200">
    <h1>Please wait</h1>
    <p>Each assignment takes a while the first time, and is lightning fast thereafter.</p>
    <p>Don't worry, optimizations are coming soon to allow this to happen in the background!</p>
  </div>
  <div id="loadingSpinner" class="lds-roller"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
  `;
  const container = getModal("div", innerHTML);
  container.id = INDICATOR_ID;
  document.body.appendChild(container);
  return () => {
    const el = document.getElementById(INDICATOR_ID);
    el && el.remove();
    removeBlur();
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
  <div id="${id}" class="m-1 lg:m-3 p-1 lg:p-3 bg-green-200 rounded w-full flex flex-row items-center">
    <p class="text-md text-green-900 flex-grow">
      Success: ${msg}
    </p>
    <button
      id="closeStatus"
      onClick="document.getElementById('${id}').remove();"
      class="text-lg text-black focus:ring hover:bg-red-200 p-2 bg-grey-100">
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
    <p class="text-md text-green-900 flex-grow">
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
 * Apply the comment from a given register to the current assignment.
 * The register MUST have a comment value already defined.
 */
function applyComment(register) {
  const current = state.assignmentData.submissions[state.currentlyViewingIndex];
  const comment = state.commentBank.registers[register];
  if (!comment) {
    current.comment = "";
  } else {
    if (current.comment !== comment) {
      markUnSynced();
    }
    current.comment = comment;
  }
  current.changed = true;
  updateView();
}

/**
 * This same handler recieves the comment-entry modal form, regardless of
 * whether it is a comment bank comment, or a manual comment. DOM state will
 * cause this handler to behave appropriately for both circumstances. See
 * `injectCommentBankModal`.
 */
function handleCommentModalSubmitted(e) {
  e.preventDefault();
  const userInput = e.target.elements.comment.value;
  const register = e.target.elements.register.value;
  state.commentBank.registers[register] = userInput;

  applyComment(register);
  removeCommentBankModal();
}

/**
 * Inject a form for the user to compose a comment, either into a comment
 * bank register, or as a manual comment.
 *
 * By setting the hidden register field to `null` for manual comments, those
 * will be saved into a hidden register and applied immediately (like banked
 * comments). Putting this state into the DOM at this stage simplifies
 * downstream form submission handling.
 */
function injectCommentBankModal(
  registerName = null,
  currentValue = "",
  prompt = "Please enter your comment"
) {
  // validate register choice. It can be null, in the case of a manual comment
  let register;
  if (registerName && /[a-zA-Z,.\/;']/.test(registerName)) {
    register = registerName;
  } else {
    // manual comment
    register = null;
  }

  // update DOM
  applyBlur();

  // block keyboard shortcut response
  state.shortcutListenerActive = false;

  // inject the form
  const innerHTML = `
    <div class="modal-container relative p-1 lg:p-3 bg-white w-11/12 md:max-w-md mx-auto rounded shadow-lg z-50 overflow-y-auto">
      <input type="hidden" value="${register}" name="register" />
      <div>
        <label for="comment">${prompt}</label>

        <p class="mb-1 text-xs text-gray-600">
          ${
            Math.random() > 0.5
              ? `Tip: did you know that you can use the <code>tab</code> key to
          focus on the "submit" button, then the <code>spacebar</code> to
          click it without your mouse?`
              : `Tip: did you know you can dismiss this dialogue box by simply
          pressing the <code>Escape</code> key instead of the close button?`
          }
          <span class="text-green-700"> Very speedy!</span>
        </p>

        <textarea id="commentInput" name="comment" placeholder="Enter your comment"></textarea>
      </div>
      <input class="p-1 rounded shadow focus:ring-2 focus:ring-black" type="submit" value="Submit" />
      <button class="p-1 m-1 font-medium text-white bg-red-700 rounded shadow focus:ring-red-300" hover:bg-red-600 onClick="removeCommentBankModal()">Close</button>
    </div>
  `;

  const form = getModal("form", innerHTML);

  form.id = "commentInputForm";
  form.addEventListener(
    "submit",
    // whether a prefix register is defined determines which event handler
    // gets used
    handleCommentModalSubmitted
  );

  document.body.appendChild(form);

  // the setTimeout is necessary here because for some reason, focusing the
  // textarea causes the keyboard shortcut key to end up in the text input,
  // and even if the value is reset here, the bug still happens, but wrapping
  // it in setTimeout capitulates the cursed javascript overlords
  setTimeout(() => {
    const commentInput = document.getElementById("commentInput");
    commentInput.focus();
    commentInput.value = currentValue || "";
  });
}

/**
 * In response to user pressing the "close" button. Does not mean that we
 * recieved input, so we will just restore the state and return.
 */
function removeCommentBankModal() {
  document.getElementById("commentInputForm").remove();
  removeBlur();
  state.shortcutListenerActive = true;
}

/**
 * A comment bank sequence is 'b' or 'B' followed by any postfix character.
 *
 * 'b' triggers an input-mode action. If the postfix register has a comment, it
 * will be input into the comment field. If not, the user may enter a new
 * comment, save it to that register, and then the new comment bank comment
 * will be input.
 *
 * 'B' triggers an comment bank edit-mode action. It allows the user to revise
 * comment bank entries.
 *
 */
function beginCommentBankFlow(register) {
  // validate register
  if (!/[a-zA-Z,.\/;']/.test(register)) {
    console.error("Invalid register: ", register);
  }
  if (
    state.commentBank.registers[register] &&
    state.commentBank.prefixKey.value ===
      state.commentBank.prefixKey.choices.normalMode
  ) {
    // the register is has a comment, and we are in normal mode; let's apply
    // the saved comment
    state.assignmentData.submissions[state.currentlyViewingIndex].comment =
      copyStr(state.commentBank.registers[register]);
    updateView();
  } else if (
    // if the prefix key was `B`, we are going to edit the stored comment
    // bank value no matter what
    state.commentBank.prefixKey.value ===
      state.commentBank.prefixKey.choices.editMode ||
    // also, we need input if the register is empty
    state.commentBank.registers[register] === undefined
  ) {
    // at this point, we are done with the prefix, so let's unset it before
    // injecting the user input modal
    state.commentBank.prefixKey.value =
      state.commentBank.prefixKey.choices.noPrefix;

    injectCommentBankModal(
      register,
      state.commentBank.registers[register],
      `Enter a comment for comment bank register ${register}`
    );
  }
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
      if (newIndex < state.assignmentData.submissions.length) {
        await saveSubmission();
        state.currentlyViewingIndex = newIndex;
        await checkSubmissionDetails();
        updateView();
      }
      break;
    case true:
      newIndex = state.currentlyViewingIndex - 1;
      if (newIndex >= 0) {
        await saveSubmission();
        state.currentlyViewingIndex = newIndex;
        await checkSubmissionDetails();
        updateView();
      }
      break;
  }
}

/****************************************************************************
 * event handlers
 */

async function handleDiffSelectSlider() {
  const inputEl = document.getElementById("diffSelectInput");
  const newState = !inputEl.checked;
  state.viewDiffOnly = newState;
  inputEl.checked = newState;
  await updateStateWithData();
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
    // comment bank
    case state.commentBank.prefixKey.choices.normalMode:
      state.commentBank.prefixKey.value =
        state.commentBank.prefixKey.choices.normalMode;
      break;
    case state.commentBank.prefixKey.choices.editMode:
      state.commentBank.prefixKey.value =
        state.commentBank.prefixKey.choices.editMode;
      break;
    case "c":
      injectCommentBankModal(
        null,
        state.assignmentData.submissions[state.currentlyViewingIndex].comment
      );
      break;
    case "s":
      saveSubmission().then(() => {
        indicateSuccess("saved");
      });
      break;
    case "Enter":
      // next or prev student
      switchStudent();
      break;
    default:
      if (e.keyCode >= 48 && e.keyCode <= 71) {
        // number or backspace
        handleGradeInput(e.key);
      } else {
        // if a comment bank prefix has been set, then *this* is the postfix
        // character, so we will respond to it
        if (
          state.commentBank.prefixKey.value !==
          state.commentBank.prefixKey.choices.noPrefix
        ) {
          beginCommentBankFlow(e.key);
        }
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
    case "Escape":
      removeCommentBankModal();
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
  await updateStateWithData();
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
