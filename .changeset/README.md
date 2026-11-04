# Package changes

Add a changeset for each consumer-visible change with `corepack pnpm changeset`.
The Changesets workflow maintains the version/changelog pull request. After its merge,
validate the exact archive and Workshops acceptance before dispatching `release.yml`
with `latest`. Publication uses npm OIDC and the immutable validated archive.

The first normal release starts the owner-requested 0.0.x version line; existing
0.1.0-alpha versions remain available but are no longer the default release channel.
