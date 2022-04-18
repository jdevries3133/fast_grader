# ⚡️ Grade Like Lightning 🌩

<img style="height: 200px" src="./django/fast_grader/static/brand/logo.webp" />

**Grading in Online Assignments is not Fun**

Let's say you are grading a google docs/slides assignment. The grading page
itself is a javascript behemoth that takes several seconds to load, then the
embedded google document takes additional seconds to load! Then, you will sit
around for even longer while the page glitches out as every image, video and
animation moseys its way on into the page.

To add insult to injury, Google Classroom has no keyboard shortcuts for
advancing between assignments, entering grades, etc. It is a painful
point-and-click slog that plagues teachers around the world. The problem is
even worse if you are a teacher with a large volume of students.

### When you give an assignment, _hundreds_ of students complete it.

Or, at least, you think they do – until now you haven't really had time to
check all that work, have you 🤔

## Features

### Super Fast

The app converts student assignments to plain text (the best kind of text), and
caches _all_ student submissions in your browser, so thay are **instantly**
ready when you are.

### Easy to Use

The barrier to entry for teachers is kept low. Simple oauth social account
sign in allows users to get started right away, and our browser extension
fills the gaps for augmenting the Google Classroom UI.

### Open Source

If you know the web, come
[contribute!](https://github.com/jdevries3133/fast_grader)

## Software Components

This is a monorepo:

| Path        | Content                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| ./django    | The Django application                                                                                  |
| ./extension | The browser extension which facilitates "manual" grade syncing in Google Classroom via DOM manipulation |
| ./docs      | Documentation website content                                                                           |
