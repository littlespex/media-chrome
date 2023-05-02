---
title: <media-cast-button>
description: Media Cast Button
layout: ../../../layouts/ComponentLayout.astro
source: https://github.com/muxinc/media-chrome/tree/main/src/js/media-cast-button.js
---

Button to bring up the Cast menu and select playback on a Chromecast device.

<h3>Show cast menu</h3>

<media-cast-button></media-cast-button>

```html
<media-cast-button></media-cast-button>
```

<h3>Stop casting</h3>

<media-cast-button mediaiscasting></media-cast-button>

```html
<media-cast-button mediaiscasting></media-cast-button>
```

<h3>Alternate content</h3>

<media-cast-button>
  <span slot="enter">Cast</span>
  <span slot="exit">Exit</span>
</media-cast-button>
<media-cast-button mediaiscasting>
  <span slot="enter">Cast</span>
  <span slot="exit">Exit</span>
</media-cast-button>

```html
<media-cast-button>
  <span slot="enter">Cast</span>
  <span slot="exit">Exit</span>
</media-cast-button>
<media-cast-button mediaiscasting>
  <span slot="enter">Cast</span>
  <span slot="exit">Exit</span>
</media-cast-button>
```