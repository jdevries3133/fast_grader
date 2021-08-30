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
  // The init event may fire more than once, but we only want to respond to
  // it the first time
  isAppInitialized: false,

  // the global shortcut listener is paused when we are recieving keyboard
  // input and don't want it to do anything
  shortcutListenerActive: true,

  // shift key inverts some commands
  shiftHeld: true,

  // all google classroom data
  assignmentData: {
    currentlyViewingIndex: 0,
    assignments: [
      {
        id: "",
        studentName: "",
        studentSubmission: [""],
        maxGrade: 100,
        comment: [""],
      },
    ],
  },

  // comment bank store
  // TODO: sync with and read from localStorage (premium feature?)
  commentBank: {
    sequenceStarted: false,
    registers: {
      // store for the comment bank. For example:
      // v: 'I am the comment in register `v`'
    },
    sequenceType: {
      value: "noop",
      choices: {
        noop: "noop",
        edit: "edit",
        normal: "normal",
      },
    },
  },
};

/****************************************************************************
 * functions
 */

/**
 * Responds to the event that starts the application. Before the application
 * is started, there are some htmx elements on the page for settings
 * configuration
 */
async function init() {
  if (!state.isAppInitialized) {
    state.isAppInitialized = true;

    await fetchData();
    updateView();
    removeBlur();

    document.body.addEventListener("keypress", handleKeyPress);
    document.body.addEventListener("keydown", handleKeyDown);
    document.body.addEventListener("keyup", handleKeyUp);
  }
}

/**
 * Hack to force a string to be copied.
 */
function copyStr(str) {
  return " " + str.slice(1);
}

/**
 * Populate state.assignmentData.assignments
 */
async function fetchData() {
  const data = await fetch(dataUri);
  state.assignmentData.assignments = await data.json();
  state.ready = true;
}

/**
 * Send state.assignmentData.assignments to the backend, and append any new
 * assignments to the list.
 */
function syncData() {}

/**
 * We aren't in happy react land anymore, so this will update the DOM, and we
 * can call it from other functions whenever we update the global state.
 */
async function updateView() {
  current =
    state.assignmentData.assignments[
      state.assignmentData.currentlyViewingIndex
    ];
  const nameEl = document.getElementById("grName");
  const gradeEl = document.getElementById("grGrade");
  const commentEl = document.getElementById("grComment");
  const pagerEl = document.getElementById("studentContent");

  nameEl.innerText = current.studentName;
  gradeEl.innerText = current.grade || "__";
  commentEl.innerText = current.comment || "__";
  pagerEl.innerHTML = current.studentSubmission
    .slice(current.currentlyViewingIndex)
    .map((chunk) => `<code class="break-word my-3 block">${chunk}</code>`)
    .join("\n");
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
 * Every time the user types an number or backspace, it will be entered into
 * the grade "field".
 */
function handleGradeInput(char) {
  const current =
    state.assignmentData.assignments[
      state.assignmentData.currentlyViewingIndex
    ];
  // concatenate the input to the grade field, only if it is a number
  if (char !== "Backspace") {
    value = parseInt(char);
    if (!isNaN(value)) {
      const newValue = current.grade + value.toString();
      // prevent leading zeroes
      if (value === 0 && !current.grade) {
        return;
      }
      // prevent excessive values
      if (newValue <= current.maxGrade) {
        current.grade = newValue;
      }
    }
  } else {
    // "backspace" the last number from the grade field
    current.grade = current.grade.slice(0, -1);
  }
  updateView();
}

/**
 * Called when the user types "c": the shortcut for writing a comment. This
 * opens the comment field for editing.
 */
function handleManualComment(e) {
  e.preventDefault();
  console.log(e);
}

/**
 * Inject a form for the user to compose a comment, either into a comment
 * bank register, or as a manual comment.
 */
function commentBankPrompt(
  registerName,
  currentValue,
  prompt = "Please enter your comment"
) {
  // validate register
  let register;
  if (!/[a-zA-Z,.\/;']/.test(registerName)) {
    register = registerName;
  } else {
    // manual comment
    register = null;
  }

  // update DOM
  applyBlur();

  f = document.createElement("form", {
    id: "commentForm",
  });
  f.addEventListener(
    "submit",
    register ? handleCommentBank : handleManualComment
  );
  f.classList.add(...["bg-red-900", "fixed", "z-10"]);
  f.innerHTML = `
    ${
      (register &&
        `<input type="hidden" name="register" value="${register}" />`) ||
      ""
    }
    <label for="comment">${prompt}</label>
    <textarea name="comment" placeholder="Enter your comment">${
      currentValue || ""
    }</textarea>
    <input type="submit" value="Submit" />
  `;
  container = document
    .getElementById("toolContainer")
    .parentNode.appendChild(f);
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
function handleCommentBank(e) {
  e.preventDefault();
  // it only *is* a postfix if some prefix was set
  if (
    state.commentBank.sequenceType.value ===
    state.commentBank.sequenceType.choices.noop
  ) {
    return;
  }

  /**
   * This will get called when the action branches are finished, to clear
   * the prefix key from global state.
   */
  function restoreNoop() {
    state.commentBank.sequenceType.value =
      state.commentBank.sequenceType.choices.noop;
  }

  // a prefix flag was set, lets handle it
  if (
    // the comment bank state is normal mode because the prefix was 'b'
    state.commentBank.sequenceType.value ===
    state.commentBank.sequenceType.choices.normal
  ) {
    // get comment bank register
    const currentValue = state.commentBank.registers[postfix];
    if (currentValue === undefined) {
      // the register was undefined, we need to get a new value
      const newVal = commentBankPrompt(postfix);
      state.commentBank.registers[postfix] = newVal;
      return restoreNoop();
    } else {
      // the register had a value, we will apply it
      state.assignmentData.assignments[
        state.assignmentData.currentlyViewingIndex
      ].comment = copyStr(currentValue);
      return restoreNoop();
    }
  }
  if (
    // the comment bank state is edit mode because the prefix was 'B'
    state.commentBank.sequenceType.value ===
    state.commentBank.sequenceType.choices.edit
  ) {
    // allow the user to input a new comment no matter what; allow them to
    // edit a value if it is already there, and then apply the value.
    const currentValue = state.commentBank.registers[postfix] || "";
    const newVal = commentBankPrompt(postfix, currentValue);
    state.commentBank.registers[postfix] = newVal;
    return restoreNoop();
  }
}

/**
 * Global switch listening to any and every key press to facilitate global
 * keyboard shortcuts.
 *
 * Only do anything if shortcutListenerActive is turned on. Other functions
 * can disable shortcuts when they are recieving text input, for example.
 */
function handleKeyPress(e) {
  switch (e.key) {
    // comment bank
    case "b":
      state.commentBank.sequenceType.value =
        state.commentBank.sequenceType.choices.normal;
      break;
    case "B":
      state.commentBank.sequenceType.value =
        state.commentBank.sequenceType.choices.edit;
      break;
    case "c":
      // manual comment
      commentBankPrompt();
      break;
    case " ":
      // keyboard shortcut scroll
      break;
    case "Enter":
      // next or prev student
      break;
    default:
      if (e.keyCode >= 48 && e.keyCode <= 71) {
        // number or backspace
        handleGradeInput(e.key);
      } else {
        // the only other possibility is that this is a comment bank postfix.
        // the handler will determine whether that is the case
        handleCommentBank(e.target.value);
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
      handleGradeInput(e.key);
  }
}

function handleKeyUp(e) {
  if (e.key === "Shift") {
    state.shiftHeld = false;
  }
}

/****************************************************************************
 * Main event listener
 */
document.body.addEventListener("startGrader", init);
