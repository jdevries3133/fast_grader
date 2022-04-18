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
 */

import { GradingSessionDetailResponse } from "./api";

/*
 * Route: /grader/session/<int:pk/
 */
export const gradingSessionDetail: GradingSessionDetailResponse = {
  pk: 2,
  api_assignment_id: "319837130648",
  max_grade: 75,
  teacher_template: "",
  sync_state: "S",
  submissions: [
    {
      pk: 3,
      api_student_profile_id: "104478187393448600976",
      api_student_submission_id: "Cg0IlcG081QQmJ-dvqcJ",
      profile_photo_url:
        "https://lh3.googleusercontent.com/a-/AOh14GjJcWJcr-jaXPvSIkoAU-VQI3ajPPBDzgo2GtqYcw",
      submission: [
        "Jack DeVries - This is attachment three",
        "=======================================",
        "--- teacher original",
        "",
        "+++ student submission",
        "",
        "@@ -6,2 +6,2 @@",
        "",
        " Your answer:",
        "-_________",
        "+_____great stuff____",
        "Jack DeVries - Attachment One",
        "=============================",
        "--- teacher original",
        "",
        "+++ student submission",
        "",
        "@@ -1,2 +1,2 @@",
        "",
        " ﻿This is attachment one?",
        "-It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like).",
        "+It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their thicc default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like).",
        "Jack DeVries - Attachment Two",
        "=============================",
        "--- teacher original",
        "",
        "+++ student submission",
        "",
        "@@ -3,3 +3,3 @@",
        "",
        " ",
        "-Where can I get some?",
        "+Where can I get some more?",
        " There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour, or randomised words which don't look even slightly believable. If you are going to use a passage of Lorem Ipsum, you need to be sure there isn't anything embarrassing hidden in the middle of text. All the Lorem Ipsum generators on the Internet tend to repeat predefined chunks as necessary, making this the first true generator on the Internet. It uses a dictionary of over 200 Latin words, combined with a handful of model sentence structures, to generate Lorem Ipsum which looks reasonable. The generated Lorem Ipsum is therefore always free from repetition, injected humour, or non-characteristic words etc.",
        "1800x1200_is_my_cat_normal_slideshow.jpg",
        "========================================",
        "1800x1200_is_my_cat_normal_slideshow.jpg could not be imported because it is not from a GSuite program like Google Docs, Google Slides, etc.",
      ],
      student_name: "Jack DeVries",
      grade: 58,
      comment: "Nice",
    },
    {
      pk: 4,
      api_student_profile_id: "100316609354151322799",
      api_student_submission_id: "Cg4IzILhqI0LEJifnb6nCQ",
      profile_photo_url: "https://lh3.googleusercontent.com/a/default-user",
      submission: [
        "Jack DeVries - This is attachment three",
        "=======================================",
        "--- teacher original",
        "",
        "+++ student submission",
        "",
        "@@ -6,2 +6,2 @@",
        "",
        " Your answer:",
        "-_________",
        "+____awful_____",
        "Jack DeVries - Attachment One",
        "=============================",
        "--- teacher original",
        "",
        "+++ student submission",
        "",
        "@@ -1,2 +1,2 @@",
        "",
        " ﻿This is attachment one?",
        "-It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like).",
        "+It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and song a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like).",
        "Jack DeVries - Attachment Two",
        "=============================",
        "--- teacher original",
        "",
        "+++ student submission",
        "",
        "@@ -4,2 +4,2 @@",
        "",
        " Where can I get some?",
        "-There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour, or randomised words which don't look even slightly believable. If you are going to use a passage of Lorem Ipsum, you need to be sure there isn't anything embarrassing hidden in the middle of text. All the Lorem Ipsum generators on the Internet tend to repeat predefined chunks as necessary, making this the first true generator on the Internet. It uses a dictionary of over 200 Latin words, combined with a handful of model sentence structures, to generate Lorem Ipsum which looks reasonable. The generated Lorem Ipsum is therefore always free from repetition, injected humour, or non-characteristic words etc.",
        "+There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour, or randomised words which don't look even slightly believable. If you are going to use a passage of Lorem Ipsum, you need to be sure there isn't anything stupendous embarrassing hidden in the middle of text. All the Lorem Ipsum generators on the Internet tend to repeat predefined chunks as necessary, making this the first true generator on the Internet. It uses a dictionary of over 200 Latin words, combined with a handful of model sentence structures, to generate Lorem Ipsum which looks reasonable. The generated Lorem Ipsum is therefore always free from repetition, injected humour, or non-characteristic words etc.",
      ],
      student_name: "Jack DeVries",
      grade: 66,
      comment: "cool",
    },
  ],
  average_grade: 62.0,
  google_classroom_detail_view_url:
    "https://classroom.google.com/c/MzgxNTMyMDA3ODU5/a/MzE5ODM3MTMwNjQ4/submissions/by-status/and-sort-first-name/all",
};
