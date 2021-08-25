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

const data_uri = "/grader/assignment_data/";

const state = {
  // the global shortcut listener is paused when we are recieving keyboard
  // input and don't want it to do anything
  shortcutListenerActive: true,

  // shift key inverts some commands
  shiftHeld: true,

  // allow an escape hatch from keyboard-only scroll to be more user friendly
  scrollMode: {
    value: "k",
    choices: {
      keyboardOnly: "k",
      scrollableDiv: "s",
    },
  },

  // all google classroom data
  assignmentData: {
    currentlyViewingIndex: 0,
    assignments: [
      {
        id: "",
        studentName: "",
        studentSubmission: "", // this will be a *long* string (plain text)
        grade: null,
        maxGrade: 100,
        comment: "",
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
 * Hack to force a string to be copied.
 */
function copyStr(str) {
  return " " + str.slice(1);
}

/**
 * Populate state.assignmentData.assignments
 */
async function fetchData() {
  const data = await fetch(data_uri);
  console.log(data);
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
function updateView() {}

/**
 * The student submission can be paged by any integer; a percentage of the
 * height of the text pager element. Negative values will cause a scroll
 * backwards while positive ones will scroll forwards.
 *
 * This is only used when the sroll mode is set to keyboard only (the default).
 */
function pageSubmission(scrollBy) {}

/**
 * Recieve the event from the scroll mode toggle switch.
 *
 * In keyboard-only mode, the text will not be "scrollable," but users can
 * page through with the keyboard like a terminal application. This is the
 * default because it is much faster and is part of the core concept of the
 * app.
 *
 * However, users can also switch to normal scroll mode, where we will just let
 * the student work pane be a plain scrollable div.
 */
function handleScrollModeToggle(e) {}

/**
 * Every time the user types an number or backspace, it will be entered into
 * the grade "field".
 */
function handleGradeInput(char) {}

/**
 * Called when the user types "c": the shortcut for writing a comment. This
 * opens the comment field for editing.
 */
function handleManualComment() {}

/**
 * Prompt the user for a new comment bank comment
 */
function _combankGetNewValue(registerName, currentValue) {}

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
function handleCommentBank(postfix) {
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
      const newVal = _combankGetNewValue(postfix);
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
    const newVal = _combankGetNewValue(postfix, currentValue);
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
      break;
    case " ":
      // keyboard shortcut scroll
      break;
    case "Enter":
      // next or prev student
      break;
    default:
      // the only other possibility is that this is a comment bank postfix.
      // the handler will determine whether that is the case
      handleCommentBank(e.target.value);
  }
}

/**
 * Shift key inverts some commands
 */
function handleKeyDown(e) {
  console.log(e);
  if (e.key === "Shift") {
    state.shiftHeld = true;
  }
}

function handleKeyUp(e) {
  if (e.key === "Shift") {
    state.shiftHeld = false;
  }
}

/****************************************************************************
 * Register event listeners
 */

document.body.addEventListener("keypress", handleKeyPress);
document.body.addEventListener("keydown", handleKeyDown);
document.body.addEventListener("keyup", handleKeyUp);

// initialize data. This needs to respond to an event at the end of the
// course and assignment selection flow, though; not just fire right away.
fetchData();
