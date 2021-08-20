# Help

I am chunking the project into issues on the [issues tab
](https://github.com/jdevries3133/fast_grader/issues). Start there if you
want to help. Find something you can do, leave a comment on the issue, and
get started! If you are new to open source contributing, there are lots of
guides and tutorials to help you through the _issue => fork => pull request_
workflow, like [this one
](https://github.com/firstcontributions/first-contributions)

# `./misc` (what are we doing here)

Look in the `./misc` folder for the plan.

# Helper Scripts

In `./scripts`, there are a few helpeful scripts:

| Script            | Purpose                                         |
| ----------------- | ----------------------------------------------- |
| `install_deps.sh` | install npm and python dependencies             |
| `run_all.sh`      | run django and next.js dev servers concurrently |
| `test_all.sh`     | run django and next.js test suites              |

**Note:** `run_all.sh` has a dependency on `rn`. [See src.](./scripts/run_all.sh)
