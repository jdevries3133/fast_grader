This module is a simple Django app for receiving GitHub web hooks and
performing a safe automated deployment. I found that existing CD options were
too heavyweight for my small use case, and this very simple module includes
several key features:

- receives webhooks from GitHub
- performs keyed-hash message authentication on requests to protect against
  potential DoS vulnerabilities
- pulls new code with git
- runs the test suite
- updates dependencies
- performs build pipelines for static files.

Also notice that this package includes thorough unit tests for the view,
ensuring that message authentication is correct and remains correct.
