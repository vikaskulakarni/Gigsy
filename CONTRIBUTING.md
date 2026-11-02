# Contributing to Gigsy

Thanks for helping improve Gigsy.

## Development setup

1. Read [README.md](./README.md) and the relevant setup guide.
2. Create your local environment from `.env.example`. Never commit real credentials, local environment files, database dumps, or ChromaDB data.
3. Install dependencies with `npm ci`.
4. Start MySQL and the semantic service as described in the setup documentation.
5. Run the app locally and verify the area you changed.

## Branching

Do not commit feature work directly to `main`.

Use descriptive branches:
- `feat/<short-description>` for features
- `fix/<short-description>` for bug fixes
- `docs/<short-description>` for documentation
- `chore/<short-description>` for maintenance

## Commits

Use concise messages that explain the change, for example:
- `feat: add freelancer profile filters`
- `fix: handle expired sessions`
- `docs: clarify local ChromaDB setup`

Keep commits focused. Do not create commits under another contributor's identity.

## Pull requests

1. Keep each PR focused on one issue or coherent change.
2. Explain the problem, implementation, and manual tests performed.
3. Include screenshots for visible UI changes.
4. Mention database migrations and environment-variable changes.
5. Do not merge failing checks or unresolved review feedback.
6. The repository owner reviews and merges changes to `main`.

## Before opening a PR

- Run `npx tsc --noEmit`.
- Run `npm run build` when the change affects application behavior or build configuration.
- Test relevant client/freelancer flows locally.
- Confirm no secrets, generated files, backups, or personal data are staged.

## Database changes

Prefer additive, documented migrations. Do not drop or rewrite existing user, gig, proposal, message, or vector data without an explicitly reviewed migration plan.
