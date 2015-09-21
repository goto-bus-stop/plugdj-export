# Plug.dj Playlist Exporter

This exports all your plug.dj playlists to YouTube _and SoundCloud_ quickly and
easily, without copying any video IDs or saving/uploading any files.

## Usage

First, add the link below to your bookmarks bar. Then, join any room on
plug.dj, and press the bookmark once you can see the chat.

```
javascript:$.getScript('https://rawgit.com/goto-bus-stop/plugdj-export/master/index.js');
```

When you press the bookmark, you'll be prompted to log in to your YouTube and
SoundCloud accounts, so the bookmark can create playlists and add songs to them.
Once that's done, every one of your playlists will be handled in order
automatically.

It's important that you don't refresh while the bookmark is running, since it
won't have finished adding songs yet. So if you do accidentally refresh and
re-run the bookmark, you'll end up with a bunch of duplicate exported playlists.
You'll have to manually delete the duplicate playlists in that case. Or leave
them be, if you don't mind duplicates!

## Alternatives

Several people have built playlist exporting scripts. Some of the popular ones
are:

  * [Plug2YouTube](https://p2y.thedark1337.com) - Made by thedark1337.
    Has been around for a long time. It exports a single playlist at a time,
    but it's been known to sometimes mix up playlists when multiple people use
    it simultaneously. YouTube only.
  * [PYE](http://pye.sq10.net) Made by Ivan.
    It exports all your playlists, similar to this bookmark. It's a bit harder
    to use, though. SoundCloud support is coming soon, apparently!
  * [Other](https://docs.google.com/document/d/1_ifpGijzhdjU3XxZ0bvBgFh1L_gcGWhh97wS9SjVs4s/edit) -
    A Google doc on several more playlist importers and other goodies.

## License

[MIT](./LICENSE)
