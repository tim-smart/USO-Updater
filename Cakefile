fs: require 'fs'
path: require 'path'
process.mixin global, require 'sys'

APP_NAME: 'USO-Updater'
COFFEE_ARGS: ['--no-wrap', '-c']
BUILD_DIR: 'build'
SOURCE_DIR: 'src'

directoryWalker: (dir, callback, maxLevels, currentLevel, fromRoot) ->
  maxLevels: if 'number' is typeof maxLevels then maxLevels else 0
  currentLevel: if 'number' is typeof currentLevel then currentLevel else 1
  fromRoot: if 'string' is typeof fromRoot then fromRoot else ''

  fs.readdir dir, (error, files) ->
    if error
      puts error.message
      return

    files.forEach (file) ->
      fs.stat path.join(dir, file), (error, stats) ->
        if error
          puts error.message
          return

        if stats.isDirectory()
          if 0 is maxLevels or maxLevels > currentLevel
            directoryWalker path.join(dir, file), callback,
                            maxLevels, 1 + currentLevel,
                            fromRoot + file + '/'
        callback.call stats, file, fromRoot, path.join(dir, file), stats

run: (cmd, args) ->
  proc: process.createChildProcess cmd, args
  proc.addListener 'error', (err) -> if err then puts err

task 'build', 'Build the ' + APP_NAME + ' from source', ->
  dirs: {}
  directoryWalker SOURCE_DIR, (file, shortPath, fullPath) ->
    if @isDirectory()
      run 'mkdir', [BUILD_DIR + '/' + shortPath + file]
    else if /\.coffee$/.test file
      args: Array::slice.call COFFEE_ARGS
      args.push.apply args, ['-o', BUILD_DIR + '/' + shortPath, fullPath]
      run 'coffee', args
    else if /\.(js|node|addon)$/.test file
      run 'cp', [fullPath, BUILD_DIR + '/' + shortPath + file]
