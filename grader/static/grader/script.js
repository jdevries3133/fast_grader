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

const dataUri = "/grader/assignment_data/";

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
 * Populate state.assignmentData.submissions
 */
async function fetchData() {
  const removeLoading = indicateLoading();
  try {
    const uri = state.viewDiffOnly ? dataUri + "?diff=true" : dataUri;
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error("Data get request failed");
    }
    const data = await response.json();
    state.assignmentData = data;
    state.ready = true;
    indicateSuccess("Your assignment data was loaded.");
  } catch (e) {
    indicateFailure(
      "Your assignment data failed to load. Please refresh the page"
    );
    console.error("Failed due to error: ", e);
  }
  removeLoading();
}

/**
 * Send state.assignmentData.submissions to the backend, and append any new
 * assignments to the list.
 */
async function syncData() {
  const removeLoading = indicateLoading();
  const _fail = () => {
    indicateFailure(
      "Data did not sync, please sync again. Do not refresh, or your changes " +
        "will be lost"
    );
    removeLoading();
    throw new Error("Update failed");
  };
  // sending the submission is problematic because the serializer on the
  // backend is jank and broken. We don't need to update the submission
  // anyway, so let's just remove it from the request data
  const data = { ...state.assignmentData };
  data.submissions = state.assignmentData.submissions.map((i) => {
    delete i.submission;
    return i;
  });
  try {
    const res = await fetch(dataUri, {
      headers: new Headers({
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
      }),
      method: "PATCH",
      body: JSON.stringify(data),
      mode: "same-origin",
    });
    if (res.ok) {
      indicateSuccess("Data was saved");
      removeLoading();
    } else {
      _fail();
    }
  } catch (e) {
    _fail();
  }
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
  const nameEl = document.getElementById("grName");
  const gradeEl = document.getElementById("grGrade");
  const maxGradeEl = document.getElementById("grMaxGrade");
  const commentEl = document.getElementById("grComment");
  const pagerEl = document.getElementById("studentContent");

  nameEl.innerText = current.student_name;
  gradeEl.innerHTML = current?.grade?.toString() || "<i>No Grade</i>";
  maxGradeEl.innerText = state.assignmentData.max_grade || "??";
  commentEl.innerHTML = current.comment || "<i>No Comment</i>";
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
  <style> .lds-roller { display: inline-block; position: relative; width: 80px; height: 80px; } .lds-roller div { animation: lds-roller 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite; transform-origin: 40px 40px; } .lds-roller div:after { content: " "; display: block; position: absolute; width: 7px; height: 7px; border-radius: 50%; background: #fff; margin: -4px 0 0 -4px; } .lds-roller div:nth-child(1) { animation-delay: -0.036s; } .lds-roller div:nth-child(1):after { top: 63px; left: 63px; } .lds-roller div:nth-child(2) { animation-delay: -0.072s; } .lds-roller div:nth-child(2):after { top: 68px; left: 56px; } .lds-roller div:nth-child(3) { animation-delay: -0.108s; } .lds-roller div:nth-child(3):after { top: 71px; left: 48px; } .lds-roller div:nth-child(4) { animation-delay: -0.144s; } .lds-roller div:nth-child(4):after { top: 72px; left: 40px; } .lds-roller div:nth-child(5) { animation-delay: -0.18s; } .lds-roller div:nth-child(5):after { top: 71px; left: 32px; } .lds-roller div:nth-child(6) { animation-delay: -0.216s; } .lds-roller div:nth-child(6):after { top: 68px; left: 24px; } .lds-roller div:nth-child(7) { animation-delay: -0.252s; } .lds-roller div:nth-child(7):after { top: 63px; left: 17px; } .lds-roller div:nth-child(8) { animation-delay: -0.288s; } .lds-roller div:nth-child(8):after { top: 56px; left: 12px; } @keyframes lds-roller { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
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
        current.grade = newValue;
      }
    }
  } else {
    // "backspace" the last number from the grade field
    if (curGradeStr.length === 1) {
      current.grade = 0;
    } else {
      current.grade = parseInt(curGradeStr.slice(0, -1));
    }
  }
  updateView();
}

/**
 * Apply the comment from a given register to the current assignment.
 * The register MUST have a comment value already defined.
 */
function applyComment(register) {
  const comment = state.commentBank.registers[register];
  if (!comment) {
    state.assignmentData.submissions[state.currentlyViewingIndex].comment = "";
  } else {
    state.assignmentData.submissions[state.currentlyViewingIndex].comment =
      comment;
  }
  updateView();
}

/**
 * onSubmit handler for the modal comment input when it is a manual comment;
 * i.e.  the `c` key was pressed.
 */
function handleManualCommentInputRecieved(e) {
  e.preventDefault();

  const userInput = e.target.elements.comment.value;
  const register = e.target.elements.register.value;

  state.commentBank.registers[register] = userInput;
  applyComment(register);
  removeCommentBankModal();
}

/**
 * onSubmit handler for the modal comment input when it is a comment-bank
 * comment; i.e.  the `b` key was pressed.
 */
function handleCommentBankInputRecieved(e) {
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
    register ? handleCommentBankInputRecieved : handleManualCommentInputRecieved
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
function switchStudent() {
  let newIndex;
  switch (state.shiftHeld) {
    case false:
      newIndex = state.currentlyViewingIndex + 1;
      if (newIndex < state.assignmentData.submissions.length) {
        state.currentlyViewingIndex = newIndex;
        updateView();
      }
      break;
    case true:
      newIndex = state.currentlyViewingIndex - 1;
      if (newIndex >= 0) {
        state.currentlyViewingIndex = newIndex;
        updateView();
      }
      break;
  }
}

/****************************************************************************
 * event handlers
 */

/**
 * Handler will trigger when user presses the "Save and Exit" button. If the
 * grader is initialized, we will save their work before exiting, then
 * redirect to account home upon successful save.
 */
async function handleSaveAndExit() {
  const _exit = () =>
    (window.location.href = `${window.location.origin}/accounts/profile/`);

  if (!state.isInitialized) {
    // if the app is not initialized, there is nothing to save and nothing to
    // lose. We can exit safely without care.
    exit();
  } else {
    try {
      await syncData();
      _exit();
    } catch (e) {
      indicateFailure(
        "Abandoning request to leave grader to avoid losing work. Please try " +
          "saving again"
      );
    }
  }
}

async function handleDiffSelectSlider() {
  const inputEl = document.getElementById("diffSelectInput");
  const newState = !inputEl.checked;
  state.viewDiffOnly = newState;
  inputEl.checked = newState;
  await fetchData();
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
      syncData();
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
  await fetchData();
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
document
  .getElementById("leaveGrader")
  .addEventListener("click", handleSaveAndExit);
