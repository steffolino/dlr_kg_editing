# Deployment Notes

## GitHub Pages (static demo)

This project can be published to GitHub Pages using a static build via:

```bash
npm run generate
```

The generated output is in:

```text
.output/public
```

## Included CI workflow

The workflow file `.github/workflows/deploy-pages.yml` is configured to:

1. run on pushes to `master` and via manual dispatch,
2. generate static output,
3. deploy to GitHub Pages.

It also auto-detects base path:

- if repo name is `<owner>.github.io` -> `/`
- otherwise -> `/<repo>/`

## Important limitation

GitHub Pages hosts static files only. Interactive mutation endpoints under `/api/*` do not run there.

That means the published Pages site is best used as:

- read/demo preview,
- UX walkthrough,
- navigation and visualization showcase.

For full editing/review workflows with live API behavior, run the app in Node mode (`npm run dev` or `npm run build` + `npm run preview`) on a server environment.
