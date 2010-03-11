# USO-Updater. A @require script that keeps the target script
# updated. Needs to have mustache run over the resulting Javascript,
# inserting references to metadata and such

# The anonymous function wrapper
(->
  # The USOScript class
  # -------------------

  # This class contains all logic specific to a single Userscript
  # which includes:
  #
  #  * Metadata fetching
  #  * Local metadata parsing
  #  * Merging metadata together
  #
  # It takes a single argument, which is a script ID
  class USOScript
    constructor: (scriptID) ->
      @id: parseInt scriptID

    # Contains the script ID number from USO
    id: `{{scriptID}}`

    # Contains the metadata from USO's .meta.js
    remoteMeta: `{{remoteMeta}}`

    # Refers to the metadata within the script itself
    localMeta: null

    # Fetch data from USO pertaining to the script ID.
    # Uses the parseMetadata routine to extract the information
    # from the script source
    updateRemoteMeta: (callback) ->
      self: @
      GM_xmlhttpRequest {
        url: 'https://userscripts.org/scripts/source/' + @id + '.meta.js'
        method: 'GET'
        onload: (xhr) ->
          self.remoteMeta: self.parseMetadata xhr.responseText
          callback.call self, @remoteMeta if callback
      }

    # A metadata parser that accepts input as a string
    parseMetadata: (input) ->
      output: {}

      input.replace /@(\S+?)(?::(\S+))?(?:[ \t]+([^\r\n]+)|\s+)/g, (line, key, key2, value) ->
        if key2 and 0 < key2.length
          output[key]: {} if 'object' isnt typeof output[key]
          output[key][key2]: value
        else if 'string' is typeof output[key]
          output[key]: [output[key], value]
        else if output[key] instanceof Array
          output[key].push value
        else
          output[key]: value
      output

  # Getter / Setter for the local metadata. Setter accepts
  # a E4X object, or a string. It refers to @_localMeta
  USOScript::__defineGetter__ 'localMeta', ->
    @_localMeta
  USOScript::__defineSetter__ 'localMeta', (input) ->
    @_localMeta: @parseMetadata input.toString()

  # Getter for grabbing the combined result of local metadata
  # and remote metadata
  USOScript::__defineGetter__ 'combinedMeta', ->
    return @remoteMeta if null is @localMeta

    output: {}
    key: key2: null

    for key of @remoteMeta
      output[key]: @remoteMeta[key]

    for key of @localMeta
      if typeof output[key] is typeof @localMeta[key]
        if 'object' is typeof output[key] and
           false is output[key] instanceof Array
          for key2 of @localMeta[key]
            output[key][key2]: @localMeta[key][key2]
        else
          output[key]: @localMeta[key]
      else
        output[key]: @localMeta[key]
    output

  # Updater Variables
  # -----------------

  # maxInterval is the maximum time in hours between update
  # checks
  maxInterval: `{{maxInterval}}`

  # increment is the current iteration the updater is on, in
  # terms of calculating the dynamic interval
  increment: parseInt GM_getValue('uso_updater/last_increment', 0), 10

  # Updater Functions
  # -----------------

  # calculateInterval uses a special equation to work out the
  # optimal next time to check for an update
  calculateInterval: (increment, max) ->
    hours: Math.round Math.exp(increment) * (1 / (Math.exp(4) / 24))

    hours: if 150 < hours
      168 * Math.round hours / 168
    else if 20 < hours
      24 * Math.round hours / 24

    if hours >= max then max else hours

  # checkUpdateNeeded determines whether the updater should
  # continue checking for an update or not.
  checkUpdateNeeded: ->
    interval: 60 * 60 * calculateInterval increment, maxInterval
    if true is GM_getValue('uso_updater/enabled', true) and
       interval <= (new Date().getTime() / 1000 -
                    parseInt GM_getValue('uso_updater/last_update', 1), 10)
      checkForUpdate @, false

  # checkForUpdate checks against USO to see whether a newer
  # version is available or not.
  checkForUpdate: (forced) ->
    self: @
    previousMeta: @script.remoteMeta

    @script.updateRemoteMeta (meta) ->
      if 'string' is typeof meta['uso']['version'] and
         'string' is typeof meta['name'] and
         'string' is typeof meta['namespace']
        self.script.newVersion: parseInt meta['uso']['version'], 10
        self.script.currentVersion: parseInt previousMeta['uso']['version'], 10
        if self.script.currentVersion < self.script.newVersion and
           self.script.currentVersion >=
           parseInt GM_getValue('uso_updater/new_version', 0), 10
          GM_setValue 'uso_updater/last_increment', 1
          GM_setValue 'uso_updater/new_version', self.script.newVersion
        else if true isnt forced
          GM_setValue 'uso_updater/last_increment', 1 + increment

        if previousMeta['name'] isnt meta['name'] or
           previousMeta['namespace'] isnt meta['namespace']
          GM_setValue 'uso_updater/enabled', false

        self.onUpdate.call self, self.script, self.locale,
                           if true is forced then true else false
      else
        GM_setValue 'uso_updater/enabled', false

    GM_setValue 'uso_updater/last_update', Math.floor(new Date().getTime() / 1000)

  # USOUpdater class
  # ----------------

  # This class accepts a USOScript instance as its only argument.
  # It currently uses GM_(set|get)Value for persisting the
  # neccessary updater variables
  class USOUpdater
    constructor: (script) ->
      @script: script
      try
        if 'function' is typeof GM_xmlhttpRequest and
           location.href is top.location.href
          checkUpdateNeeded.call @
      catch error
        if 'function' is typeof GM_xmlhttpRequest
          checkUpdateNeeded.call @

    locale: (`{{locale}}`)

    updateUrl: `'{{updateUrl}}'`

    # Override this value to set-up your own update callback / UI etc
    onUpdate: (script, locale, forced) ->
      meta: @script.combinedMeta
      if @script.currentVersion < @script.newVersion
        if confirm meta['name'] + ': ' + @locale['updateAvailable']
          GM_openInTab @updateUrl
        else if forced
          alert meta['name'] + ': ' + @locale['updateUnavailable']

  # A shortcut for easily setting the local metadata
  USOUpdater::__defineSetter__ 'localMeta', (input) ->
    @script.localMeta: input

  # A getter / setter for enabling and disabling the script
  # via the GM menu
  USOUpdater::__defineGetter__ 'enabled', ->
    GM_getValue 'uso_updater/enabled', false
  USOUpdater::__defineSetter__ 'enabled', (enabled) ->
    GM_setValue('uso_updater/enabled', if true is enabled then true else false)

  # A setter for enabling / disabling force updating from menu
  USOUpdater::__defineSetter__ 'updateMenuItem', (enabled) ->
    if true is enabled
      self: @
      GM_registerMenuCommand @script.combinedMeta['name'] + ': ' +
                             @locale['menuCheckUpdates'], ->
        checkForUpdate.call self, true

  # A setter for enabling / disabling the updater
  USOUpdater::__defineSetter__ 'toggleMenuItem', (enabled) ->
    if true is enabled
      self: @
      GM_registerMenuCommand @script.combinedMeta['name'] + ': ' +
                             @locale['menuToggle'], ->
        if true is GM_getValue 'uso_updater/enabled', true
          alert self.script.combinedMeta['name'] + ': ' + self.locale['updaterOff']
          GM_setValue 'uso_updater/enabled', false
        else
          alert self.script.combinedMeta['name'] + ': ' + self.locale['updaterOn']
          GM_setValue 'uso_updater/enabled', true
)()
