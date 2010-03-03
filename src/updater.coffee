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
  #
  # It takes a single argument, which is a script ID
  class USOScript
    constructor: (scriptID) ->
      @id: parseInt scriptID

    # This will persist our script data for later use
    save: ->
      GM_setValue 'uso/script/' + @id, @toJson()

    # Load and populate instance with persisted script data
    load: ->
      data: GM_setValue 'uso/script/' + @id, null
      if null is data then false
      else
        data: JSON.parse data

    # Fetch data from USO pertaining to the script ID.
    # Uses the parseMetadata routine to extract the information
    # from the script source
    update: ->
      true

    # A metadata parser that accepts input as a string
    parseMetadata: (input) ->
      input
)()
