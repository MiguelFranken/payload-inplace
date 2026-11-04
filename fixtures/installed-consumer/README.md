# Clean installed consumer fixture

This separate Next/Payload app uses `stories.article.sections`, consumer-owned callout/quotation blocks, its own renderer and a different protected `/compose` route. All plugin imports resolve through the installed tarball. It has no workspace or plugin source aliases.

Run the repository's `test:installed-consumer` harness. It copies this template to an empty temporary directory, installs the exact checked tarball from public npm peers, generates Payload's import map, seeds a disposable Postgres database, builds Turbopack in production mode, checks native/inline/media/RTE/preview/publication behavior, and repeats public isolation with the UI disabled. Its report records artifact, source, dependency-lock and app-template hashes. It never uses customer services or records.

The media case uses `assets/synthetic-video.mp4`, a 16×16 silent black clip generated with `ffmpeg -f lavfi -i color=c=black:s=16x16:d=0.1 -an -c:v libx264 -pix_fmt yuv420p -movflags +faststart`. CI uploads the committed bytes; it does not need ffmpeg. The case verifies native video references, not a browser playback matrix. Draft fixtures activate through the public authenticated activation endpoint. They do not bypass the reviewed-publication guard to create published content.
