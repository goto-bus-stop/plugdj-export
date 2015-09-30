var playlists

function init () {
  var f = document.getElementById('playlist-file')
  f.onchange = function () {
    var file = f.files[0]
    var r = new FileReader()
    r.onload = function () {
      // magic!
      var db = new SQL.Database(new Uint8Array(r.result))
      playlists = parse(unzip(extract(db)))
      renderPlaylists(playlists)
    }
    r.readAsArrayBuffer(file)
  }
}

function extract (db) {
  try {
    // Chrome
    var results = db.exec('SELECT * FROM ItemTable')
    var values = results[0].values
    for (var i = 0, l = values.length; i < l; i++) {
      if (values[i][0] === 'media') {
        return values[i][1]
      }
    }
  } catch (e) {
    // Firefox
    // TODO this isn't right, I guess
    var results = db.exec('SELECT value FROM webappsstore2 WHERE scope = "jd.gulp.:https:443" AND key = "media"')
    console.log(results)
  }
}

function unzip (bytes, cb) {
  var buff = new Buffer.Buffer(bytes)
  var string = buff.toString('ucs2')
  return LZString.decompressFromUTF16(string)
}

function parse (json) {
  var obj = JSON.parse(json)[1]
  var m = obj.m
  var p = obj.p
  var playlists = []
  // convert plug's separate media / playlist stores to a single playlist
  // list with media per playlist
  Object.keys(p).forEach(function (key) {
    var v = p[key]
    playlists.push({
      id: parseInt(key, 10),
      name: v.name,
      items: Object.keys(v.items).map(function (id) { return m[id] })
    })
  })

  return playlists
}

function renderPlaylists (playlists) {
  var view = new PlaylistView(playlists)
  view.render()
}
