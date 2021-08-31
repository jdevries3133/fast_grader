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
  // the global shortcut listener is paused when we are recieving keyboard
  // input and don't want it to do anything
  shortcutListenerActive: true,

  // shift key inverts some commands
  shiftHeld: false,

  // recieved when we GET the data, used when we PATCH to update
  csrfToken: null,

  // all google classroom data
  assignmentData: {
    currentlyViewingIndex: 0,
    assignments: [
      {
        // this is example will be replaced after the call to fetchData()
        id: "",
        studentName: "",
        studentSubmission: [""],
        maxGrade: 100,
        comment: [""],
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
 * functions
 */

/**
 * Responds to the event that starts the application. Before the application
 * is started, there are some htmx elements on the page for settings
 * configuration
 */
async function init() {
  await fetchData();
  updateView();
  removeBlur();

  document.body.addEventListener("keypress", handleKeyPress);
  document.body.addEventListener("keydown", handleKeyDown);
  document.body.addEventListener("keyup", handleKeyUp);
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

/**
 * Populate state.assignmentData.assignments
 */
async function fetchData() {
  const response = await fetch(dataUri);
  state.assignmentData.assignments = await response.json();
  state.ready = true;
}

/**
 * Send state.assignmentData.assignments to the backend, and append any new
 * assignments to the list.
 */
async function syncData() {
  const response = await fetch(dataUri, {
    headers: new Headers({
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken"),
    }),
    method: "PATCH",
    body: JSON.stringify(state.assignmentData.assignments),
    mode: "same-origin",
  });
  if (!response.ok) {
    throw new Error("Update failed");
  }
}

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
  const maxGradeEl = document.getElementById("grMaxGrade");
  const commentEl = document.getElementById("grComment");
  const pagerEl = document.getElementById("studentContent");

  nameEl.innerText = current.studentName;
  gradeEl.innerText = current.grade || "__";
  maxGradeEl.innerText = current.maxGrade || "??";
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
      const newValue = (current.grade || "") + value.toString();
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
 * Apply the comment from a given register to the current assignment.
 * The register MUST have a comment value already defined.
 */
function applyComment(register) {
  const comment = state.commentBank.registers[register];
  if (!comment) {
    throw new Error("Comment in register is undefined", register);
  }

  state.assignmentData.assignments[
    state.assignmentData.currentlyViewingIndex
  ].comment = comment;

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
  registerName,
  currentValue,
  prompt = "Please enter your comment"
) {
  // validate register choice. It can be null, in the case of a manual comment
  let register;
  if (/[a-zA-Z,.\/;']/.test(registerName)) {
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
  f = document.createElement("form");
  f.id = "commentInputForm";
  f.addEventListener(
    "submit",
    // whether a prefix register is defined determines which event handler
    // gets used
    register ? handleCommentBankInputRecieved : handleManualCommentInputRecieved
  );

  f.classList.add(
    ...[
      "transiton",
      "fixed",
      "w-full",
      "h-full",
      "top-0",
      "left-0",
      "flex",
      "items-center",
      "justify-center",
    ]
  );

  f.innerHTML = `
    <div class="modal-overlay absolute w-full h-full bg-gray-900 opacity-50"></div>
      <div class="modal-container relative lg:p-3 bg-white w-11/12 md:max-w-md mx-auto rounded shadow-lg z-50 overflow-y-auto">

        ${/* close button */ ""}
        <div class="container">
          <input type="hidden" value="${register}" name="register" />
          <div>
            ${/* single form input; this is where the comment will go*/ ""}
            <label for="comment">${prompt}</label>

            <p class="mb-1 text-xs text-gray-600">
              Tip: did you know that you can use the <code>tab</code> key to
              focus on the "submit" button, then the <code>spacebar</code> to
              click it without your mouse?
              <span class="text-green-700"> Very speedy!</span>
            </p>

            <textarea id="commentInput" name="comment" placeholder="Enter your comment">${
              currentValue || ""
            }</textarea>
          </div>
          <input class="p-1 rounded shadow focus:ring-2 focus:ring-black" type="submit" value="Submit" />
          <button class="p-1 m-1 font-medium text-white bg-red-700 rounded shadow focus:ring-red-300" hover:bg-red-600 onClick="removeCommentBankModal()">Close</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(f);
  document.getElementById("commentInput").focus();
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
    state.assignmentData.assignments[
      state.assignmentData.currentlyViewingIndex
    ].comment = copyStr(state.commentBank.registers[register]);
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
      newIndex = state.assignmentData.currentlyViewingIndex + 1;
      if (newIndex < state.assignmentData.assignments.length) {
        state.assignmentData.currentlyViewingIndex = newIndex;
        updateView();
      }
      break;
    case true:
      newIndex = state.assignmentData.currentlyViewingIndex - 1;
      if (newIndex >= 0) {
        state.assignmentData.currentlyViewingIndex = newIndex;
        updateView();
      }
      break;
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
      // manual comment
      injectCommentBankModal();
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
