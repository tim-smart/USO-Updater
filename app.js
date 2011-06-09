// The MIT License
//
// Copyright (c) 2011 Tim Smart
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

var express = require('express')
  , updater = require('./updater')
  , http    = require('http')

var app = module.exports = express.createServer()

// Configuration
app.configure(function(){
  app.use(express.logger())
  app.use(app.router)
})

// Parse the accept-language http header
var DEFAULT_LANG = [['en', 'en', 1]]
  , STRINGS =
    { "en"                    : JSON.stringify
      ( { "updateAvailable"   : "An update is available for this script. Do you want to update now?"
        , "updateUnavailable" : "Has no updates available at this current time."
        , "menuCheckUpdates"  : "Check for updates."
        , "menuToggle"        : "Toggle auto updates."
        , "updaterOff"        : "Automatic Updates are now off."
        , "updaterOn"         : "Automatic Updates are now on."
        }
      )
    }

var parseLanguage = function (str) {
  var sortable    = []
    , fallback    = []

  if (!str) {
    return DEFAULT_LANG
  }

  str.replace
    ( /(([a-z]{1,8})(?:-[a-z]{1,8})?)\s*(?:;\s*q\s*=\s*(1|0\.[0-9]+))?/ig
    , function (all, full, abbr, weight) {
        if (weight) {
          sortable.push([full, abbr, +weight])
        } else {
          fallback.push([full, abbr, null])
        }
      }
    )

  sortable.sort(function (a, b) {
    return b[2] - a[2]
  })

  sortable.push.apply(sortable, fallback)

  // Default language is english
  if (sortable.length === 0) {
    return DEFAULT_LANG
  }

  return sortable
}

var Script = function Script (id) {
  this.id   = id
  this.meta = null
}

Script.prototype.fetchMeta = function (cb) {
  var script = this

  http.get
    ( { host : 'userscripts.org'
      , path : '/scripts/source/' + this.id + '.meta.js'
      }
    , function (res) {
        if (res.statusCode !== 200) {
          return cb()
        }

        var buf = ''
        res.setEncoding('utf8')
        res.on('data', function (d) {
          buf += d
        })
        res.on('end', function () {
          cb(null, script.parseMeta(buf))
        })
      }
    )
    .on('error', function (err) { cb(err) })

  return this
}

Script.prototype.parseMeta = function (meta) {
  var ret = {};

  meta.replace
    ( /@(\S+?)(?::(\S+))?(?:[ \t]+([^\r\n]+)|\s+)/g
    , function (line, key, key2, value) {
        if (key2 && key2.length > 0) {
          if (typeof ret[key] !== 'object') {
            ret[key] = {};
          }
          ret[key][key2] = value;
        } else if (typeof ret[key] === 'string') {
          ret[key] = [ret[key], value];
        } else if (ret[key] instanceof Array) {
          ret[key].push(value);
        } else {
          ret[key] = value;
        }
      }
    )

  if (0 === Object.keys(ret).length) {
    ret = null
  }

  this.meta = ret
  return ret
}

app.param('script_id', function (req, res, next, id) {
  id = +id

  if (!id) {
    return next()
  }

  var script = new Script(id)

  script.fetchMeta(function (err, meta) {
    if (err) {
      return next(err)
    } else if (!meta) {
      return next()
    }

    req.script = script
    next()
  })
})

app.get('/:script_id.js', function (req, res, next) {
  if (!req.script) {
    return next()
  }

  var script   = req.script
    , type     = req.query.update
    , interval = +req.query.interval
    , o, js

  try {
    script.meta = JSON.stringify(script.meta)
  } catch (err) {
    return next()
  }

  o =
    { script        : script
    , locale_string : STRINGS.en
    , api           :
         req.query.api === '1' || req.query.api === 'true'
      ? true
      : false
    , update_url    : 'http://userscripts.org/scripts/show/' + script.id
    , interval      : 7 * 24
    }

  if ('update' === type) {
    o.update_url = 'http://userscripts.org/scripts/source/'
                 + script.id
                 + '.user.js?update.user.js'

  } else if ('install' === type) {
    o.update_url = 'http://userscripts.org/scripts/source/'
                 + script.id
                 + '.user.js'
  }

  if (interval && interval >= 1) {
    o.interval = interval * 24
  }

  js = updater(o)
  res.send(js, { 'Content-Type' : 'application/javascript' })
})

app.get('*', function (req, res) {
  res.send(404)
})
