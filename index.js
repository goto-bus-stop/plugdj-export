/* global require, $, _, Backbone, gapi, API, SC */

// This is now officially a hacky monstrosity of a script. \o/

var FORMAT_YT = 1
var FORMAT_SC = 2

var OAUTH2_CLIENT_ID = '440141609143-o7ujhbv1eute4bc1u3sregmansq768ue.apps.googleusercontent.com'
var OAUTH2_SCOPES = [ 'https://www.googleapis.com/auth/youtube' ]

var shouldExportYouTube = false
var shouldExportSoundCloud = false

function toEta (s) {
  var m = Math.floor(s / 60)
  s %= 60
  return m + ':' + (s < 10 ? '0' + s : s)
}

function toJQueryDeferred (thenable) {
  return $.Deferred(function (def) {
    thenable.then(def.resolve, def.reject)
  })
}

function resolved () {
  return $.Deferred(function (def) {
    def.resolve()
  })
}

function wait (ms) {
  return $.Deferred(function (def) {
    setTimeout(def.resolve, ms)
  })
}

function fetchPlaylist (id) {
  return $.getJSON('/_/playlists/' + id + '/media')
    .then(function (result) { return result.data })
}

function getUsername () {
  return API.getUser().username
}

function getPlaylists () {
  return _.find(require.s.contexts._.defined, function (m) {
    return m && m instanceof Backbone.Collection && typeof m.jumpToMedia === 'function'
  })
}

function getPlaylistName (playlist) {
  return playlist.name + ' - ' + getUsername() + ' (Exported from plug.dj)'
}

function makeChatMessage (content) {
  var message = $('<div />').addClass('cm log').append(
    $('<div />').addClass('msg').append(
      $('<div />').addClass('text cid-not-really-relevant').append(
        content
      )
    )
  )

  $('#chat-messages')
    .append(message)
    .scrollTop(1e8)

  return message
}

function makeChatButton (text, click, once) {
  var button = $('<button />')
    .css({ padding: '5px' })
    .text(text)
  if (once !== false) {
    button.one('click', function (e) {
      message.remove()
      click(e)
    })
  } else {
    button.on('click', click)
  }
  var message = makeChatMessage(button)
  return message
}

var _authedWithYouTube = false
function authYouTube () {
  if (_authedWithYouTube) {
    return resolved()
  }
  gapi.client.setApiKey('AIzaSyAa5XoLeJrBZcXatNiE9m4MffUHELt47Pg')

  return $.Deferred(function (def) {
    gapi.auth.init(function () {
      gapi.auth.authorize({
        client_id: OAUTH2_CLIENT_ID,
        scope: OAUTH2_SCOPES,
        immediate: true
      }, function onAuthComplete (res) {
        if (res && !res.error) {
          def.resolve()
        } else {
          API.chatLog('Please press the button below to log in to YouTube, so playlists can be exported to your account.')

          makeChatButton('Log in to YouTube', function () {
            gapi.auth.authorize({
              client_id: OAUTH2_CLIENT_ID,
              scope: OAUTH2_SCOPES,
              immediate: false
            }, function (res) {
              if (res && !res.error) {
                def.resolve()
              } else {
                def.reject(res ? res.error : null)
              }
            })
          })
        }
      })
    })
  }).then(function () {
    _authedWithYouTube = true
  })
}

function getSoundCloudAuthData () {
  var sdkLoader = _.find(require.s.contexts._.defined, function (m) {
    return m && m.cb && m.cb.indexOf('sccallback') > -1
  })
  return {
    client_id: sdkLoader.id,
    redirect_uri: sdkLoader.cb
  }
}
function authSoundCloud () {
  return $.Deferred(function (def) {
    SC.connect(function () {
      def.resolve()
    })
  })
}

function getYouTubeVideoStatuses (media) {
  var current = []
  var chunks = [ current ]
  media = media.filter(function (m) { return m.format === FORMAT_YT })
  media.forEach(function (item) {
    if (current.length < 50) {
      current.push(item)
    } else {
      current = [ item ]
      chunks.push(current)
    }
  })

  var videos = []
  return chunks
    .reduce(function (promise, chunk) {
      return promise.then(function (res) {
        if (res) {
          videos = videos.concat(res.result.items)
        }
        return toJQueryDeferred(gapi.client.youtube.videos.list({
          part: 'status',
          id: chunk.map(function (m) { return m.cid }).join(',')
        }))
      })
    }, resolved())
    .then(function (res) {
      return videos.concat(res.result.items)
    })
}

function createYouTubePlaylist (name) {
  return toJQueryDeferred(gapi.client.youtube.playlists.insert({
    part: 'snippet,status',
    resource: {
      snippet: {
        title: name.replace(/[<>]/g, ''),
        description: 'Exported from Plug.dj'
      },
      status: {
        privacyStatus: 'unlisted'
      }
    }
  }))
}

function insertYouTubeItem (playlistId, media) {
  return toJQueryDeferred(gapi.client.youtube.playlistItems.insert({
    part: 'snippet,contentDetails',
    resource: {
      snippet: {
        playlistId: playlistId,
        resourceId: {
          kind: 'youtube#video',
          videoId: media.cid
        }
      },
      contentDetails: {
        note: media.author + ' - ' + media.title
      }
    }
  }))
}

function createSoundCloudPlaylist (playlist, media) {
  var tracks = media.map(function (track) {
    return { id: track.cid }
  })
  return $.Deferred(function (def) {
    var data = _.extend({
      playlist: {
        title: getPlaylistName(playlist),
        tracks: tracks,
        sharing: 'private'
      }
    }, getSoundCloudAuthData())
    SC.post('/playlists', data, function (scPlaylist) {
      def.resolve(scPlaylist)
    })
  })
}

function exportPlaylist (playlist) {
  var ytPlaylistId = null
  var promise = null
  if (shouldExportYouTube) {
    promise = createYouTubePlaylist(getPlaylistName(playlist))
      .then(function (res) { ytPlaylistId = res.result.id })
  } else {
    promise = resolved()
  }
  return function (media) {
    var sounds = []
    var videos = []

    if (shouldExportYouTube) {
      // find YT video status, so we can ignore deleted videos
      promise = promise.then(function () {
        return getYouTubeVideoStatuses(media)
      })
    }

    promise = promise.then(function (videoStatuses) {
      media.forEach(function (item) {
        if (item.format === FORMAT_YT) {
          if (shouldExportYouTube) {
            // ignore videos that have been terminated / are unavailable
            var video = _.findWhere(videoStatuses, { id: item.cid })
            if (!video || !video.status ||
                video.status.uploadStatus !== 'processed') {
              API.chatLog('Could not add "' + item.author + ' - ' + item.title + '". ' +
                          'The video might have been deleted.')
              return
            }
          }
          videos.push(item)
        } else if (item.format === FORMAT_SC) {
          sounds.push(item)
        }
      })
    })

    promise = promise.then(function () {
      if (!shouldExportYouTube) {
        return null
      }
      return videos.reduce(function (promise, item) {
        return promise.then(function () {
          return $.Deferred(function (def) {
            insertYouTubeItem(ytPlaylistId, item)
              .then(def.resolve)
              .fail(function (res) {
                API.chatLog('Could not add "' + item.author + ' - ' + item.title + '". The video might have been deleted.')
                def.resolve()
              })
          })
        })
      }, resolved())
    })

    promise = promise.then(function () {
      if (!shouldExportSoundCloud) {
        return null
      }
      if (sounds.length > 0) {
        return createSoundCloudPlaylist(playlist, sounds)
      }
    })

    promise = promise.then(function (res) {
      var result = { youtube: ytPlaylistId, soundcloud: null }
      if (res) {
        result.soundcloud = res.permalink_url
      }
      if (!shouldExportSoundCloud) {
        result.leftoverSC = sounds
      }
      if (!shouldExportYouTube) {
        result.leftoverYT = videos
      }
      return result
    })

    return promise
  }
}

function showNotExported (leftovers) {
  var Dialog = _.find(require.s.contexts._.defined, function (m) {
    return m && m.prototype && _.isFunction(m.prototype.onContainerClick)
  })
  var Events = _.find(require.s.contexts._.defined, function (m) {
    return m && m.dispatch && m.dispatch.length === 1
  })
  var ShowDialogEvent = _.find(require.s.contexts._.defined, function (m) {
    return m && m._name === 'ShowDialogEvent'
  })

  Events.dispatch(new ShowDialogEvent(
    ShowDialogEvent.SHOW,
    new (Dialog.extend({
      id: 'dialog-not-exported',
      className: 'dialog',
      submit: function () {
        this.close()
      },
      render: function () {
        var links = leftovers.map(function (media) {
          var title = media.author + ' - ' + media.title
          var a = $('<a />').text(title).attr('target', '_blank')
          if (media.format === FORMAT_YT) {
            a.attr('href', 'https://youtu.be/' + media.cid)
          } else {
            a.attr('href', '#sc' + media.cid).one('click', function (e) {
              e.preventDefault()
              SC.get('/tracks/' + media.cid, function (sound) {
                a.attr('href', sound.permalink_url)
                _.defer(function () {
                  a.click()
                })
              })
            })
          }
          return a
        })

        // lol...
        links = links.reduce(function (withNewLines, link) {
          return withNewLines.concat([
            link, $('<br />')
          ])
        }, [])

        this.$el
          .append(this.getHeader('Not Exported'))
          .append(this.getBody().append(links).css({
            'max-height': '300px',
            'overflow-y': 'scroll'
          }))
          .append(this.getButtons('Close'))
      }
    }))
  ))
}

function exportPlaylists () {
  var playlists = getPlaylists().map(function (p) { return p.toJSON() })

  API.chatLog('This script supports exporting to both YouTube and SoundCloud.')
  API.chatLog('You can select where to export things to below:')

  var ytCheckbox = $('<input />').attr({ type: 'checkbox', checked: true })
  var scCheckbox = $('<input />').attr({ type: 'checkbox' })
  makeChatMessage(
    $('<label />').text(' YouTube  ').prepend(ytCheckbox).add(
      $('<label />').text(' SoundCloud').prepend(scCheckbox)
    )
  )

  makeChatButton('Export', function () {
    shouldExportYouTube = ytCheckbox.is(':checked')
    shouldExportSoundCloud = scCheckbox.is(':checked')

    API.chatLog('Waiting for YouTube and SoundCloud authentication...')
    API.chatLog('If nothing happens, please check your browser address bar to see if any popups have been blocked.')
    var promise = resolved()
      .then(function () {
        if (shouldExportYouTube) {
          return authYouTube()
        }
      })
      .then(function () {
        if (shouldExportSoundCloud) {
          return authSoundCloud()
        }
      })

    promise = promise.then(function () {
      API.chatLog('Exporting ' + playlists.length + ' playlists...')
      API.chatLog('Please do not refresh until all playlists are exported.')
    })

    playlists.forEach(function (playlist, i) {
      var id = playlist.id
      promise = promise.then(function () {
        var eta = Math.round(playlist.count * 0.75)
        API.chatLog('Exporting ' + playlist.name + ' (' + playlist.count + ' songs - ETA ' + toEta(eta) + ')')
        return fetchPlaylist(id)
          .then(exportPlaylist(playlist))
          .then(function (results) {
            API.chatLog('Finished exporting ' + playlist.name + '.')
            if (results.youtube) {
              var url = 'https://youtube.com/playlist?list=' + results.youtube
              API.chatLog('YouTube playlist: ' + url)
            }
            if (results.soundcloud) {
              API.chatLog('SoundCloud set: ' + results.soundcloud)
            }

            if (results.leftoverSC && results.leftoverSC.length) {
              var scNotExportedText = results.leftoverSC.length + ' SoundCloud sounds were not exported. '
              var scNotExportedLink = $('<a />').attr({ href: '#' }).text('Click here to view a list.').on('click', function () {
                showNotExported(results.leftoverSC)
              })
              makeChatMessage(
                $('<span />').text(scNotExportedText).add(scNotExportedLink)
              )
            }
            if (results.leftoverYT && results.leftoverYT.length) {
              var ytNotExportedText = results.leftoverYT.length + ' YouTube videos were not exported. '
              var ytNotExportedLink = $('<a />').attr({ href: '#' }).text('Click here to view a list.').on('click', function () {
                showNotExported(results.leftoverYT)
              })
              makeChatMessage(
                $('<span />').text(ytNotExportedText).add(ytNotExportedLink)
              )
            }
          })
          .then(wait(5000))
      })
    })

    promise.then(function () {
      API.chatLog('Finished exporting playlists!')
    })

    promise.fail(function (err) {
      if (typeof err === 'string') {
        API.chatLog('An error occured while exporting playlists: ' + err)
      } else if (typeof err === 'object' && err.message) {
        API.chatLog('An error occured while exporting playlists: ' + err.message)
      } else if (typeof err === 'object' && err.error) {
        API.chatLog('An error occured while exporting playlists: ' + err.error.message)
      } else {
        API.chatLog('An unknown error occured while exporting playlists. Aborting ):')
      }
    })
  })

  API.chatLog('Beware, this script dumps a lot of information in your chat box.' +
              'You will probably not be able to use the chat well while the script is exporting playlists.')
}

exportPlaylists()
