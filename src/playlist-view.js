function PlaylistView (playlists) {
  this.collection = playlists.sort(function (a, b) {
    if (a.name > b.name) {
      return 1
    } else if (a.name < b.name) {
      return -1
    }
    return 0
  })
  this.menu = $('.playlist-menu')[0]
  this.panel = $('.playlist-panel')[0]
}

PlaylistView.prototype.select = function (id) {
  this.current = this.collection.filter(function (playlist) {
    return playlist.id == id
  })[0]
  this.renderPanel()
}

PlaylistView.prototype.render = function () {
  this.renderMenu()
  this.current = this.collection[0]
  this.renderPanel()
}

PlaylistView.prototype.renderMenu = function () {
  this.collection
    .reduce(function (els, playlist) {
      return els.concat({
        cls: 'playlist-row',
        'data-id': playlist.id,
        text: playlist.name + ' (' + playlist.items.length + ')'
      })
    }, [])
    .map(render)
    .forEach(function (el) { this.appendChild(el) }, this.menu)

  this.menu.addEventListener('click', function (e) {
    if (e.target.classList.contains('playlist-row')) {
      var playlistId = e.target.getAttribute('data-id')
      if (playlistId) {
        this.select(playlistId)
      }
    }
  }.bind(this), false)
}

PlaylistView.prototype.renderPanel = function () {
  this.panel.innerHTML = ''

  if (!this.current) {
    return
  }

  this.current.items
    .reduce(function (els, media) {
      return els.concat({
        cls: 'media-row',
        'data-id': media.id,
        children: [
          { cls: 'media-thumb', children: [
            { tag: 'img', src: media.image, alt: '' }
          ] },
          { cls: 'media-title', text: media.author + ' - ' + media.title }
        ]
      })
    }, [])
    .map(render)
    .forEach(function (el) { this.appendChild(el) }, this.panel)
}
