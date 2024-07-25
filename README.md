# Detect and Tag New Version

[![GitHub Super-Linter](https://github.com/actions/typescript-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/actions/typescript-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/actions/typescript-action/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

An updated version of
[salsify/action-detect-and-tag-new-version](https://github.com/salsify/action-detect-and-tag-new-version),
which appears to be unmaintained.

This action allows you to detect a new version of your repository based on some
change in its contents between commits, creating a Git tag if a new version is
detected.

For example, in a JavaScript repository, you could detect that the `version`
field in `package.json` had changed from `"1.0.0"` to `"1.1.0"` and therefore
create a `v1.1.0` tag from the current commit.

## Usage

The configuration below would create a new version tag in your repository any
time the contents of a `current-version.txt` file changed.

**Note**: since this action examines your Git history to detect changes, you
must set a `fetch-depth` of at least `2` with `actions/checkout` for that
history to be present.

```yml
# ...
jobs:
  tag-new-versions:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        with:
          fetch-depth: 2
      - uses: alastairmarchant/action-tag-new-version@v1
        with:
          version-command: |
            cat current-version.txt
```

### Inputs

All inputs are optional.

- `version-command`: a shell command that will be executed at the current HEAD
  and the previous commit. This command's output to stdout will be considered
  the effective version of your repository at a given commit. If unspecified,
  this action will attempt to determine an appropriate command to run
  automatically, as described below.
- `create-tag`: may be set to `false` to only detect version changes and not
  create a new tag when the version changes.
- `tag-template`: a template for producing a tag name from the current version
  of your repository. Any instance of `{VERSION}` in the string will be replaced
  with the actual detected version. Defaults to `v{VERSION}`.
- `tag-annotation-template`: a template for producing a tag annotation from the
  current version of your repository. As with `tag-template`, any instance of
  `{VERSION}` in the string will be replaced with the actual detected version.
  May be set to an empty string to produce a lightweight (i.e. annotation-less)
  tag. Defaults to `Released version {VERSION}`.

### Outputs

- `previous-version`: the detected previous version of this repository
- `current-version`: the detected current version of this repository
- `tag`: if a new tag is created, this output will contain its name

## Version Determination

If no `version-command` input is provided, this action will attempt to do
something sensible by default.

- If it finds a `package.json`, it will consider the contents of the `version`
  field there to be the repository version.
- If it finds single `*.gemspec` file, it will consider the version defined
  there to be the repository version.

The logic for this detection and the corresponding version commands used can be
found in [`determine-version.ts`](src/determine-version.ts).
