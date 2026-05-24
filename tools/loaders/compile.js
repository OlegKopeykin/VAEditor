// Origin https://github.com/peterschussheim/monaco-editor/blob/master/loaders/compile.js
// MIT License Copyright (c) 2018 Peter Schussheim
// Adapted for webpack 5: EntryPlugin, hooks.tap, deleteAsset, native getOptions

const crypto = require('crypto')

const WebWorkerTemplatePlugin = require('webpack/lib/webworker/WebWorkerTemplatePlugin')
const ExternalsPlugin = require('webpack/lib/ExternalsPlugin')
const NodeTargetPlugin = require('webpack/lib/node/NodeTargetPlugin')
const EntryPlugin = require('webpack/lib/EntryPlugin')

const COMPILATION_METADATA = Symbol('COMPILATION_METADATA')

module.exports.COMPILATION_METADATA = COMPILATION_METADATA

module.exports.pitch = function pitch (remainingRequest) {
  const opts = this.getOptions() || {}
  const { target, plugins = [], output } = opts
  const emit = opts.emit === false || opts.emit === 'false' ? false : true

  if (target !== 'worker') {
    throw new Error(`Unsupported compile target: ${JSON.stringify(target)}`)
  }

  this.cacheable(false)

  const { filename } = getOutputFilename(output, { target, resourcePath: this.resourcePath })

  // eslint-disable-next-line no-underscore-dangle
  const currentCompilation = this._compilation

  const outputOptions = {
    filename,
    chunkFilename: `${filename}.[id]`,
    publicPath: currentCompilation.outputOptions.publicPath
  }

  const compilerOptions = currentCompilation.compiler.options
  const childCompiler = currentCompilation.createChildCompiler('worker', outputOptions, [
    new WebWorkerTemplatePlugin(),
    ...((this.target === 'web') || (this.target === 'webworker') ? [] : [new NodeTargetPlugin()]),

    ...(compilerOptions.externals ? [new ExternalsPlugin('var', compilerOptions.externals)] : []),

    ...plugins,

    new EntryPlugin(this.context, `!!${remainingRequest}`, { name: 'main' })
  ])

  const callback = this.async()
  const beforeAssets = new Set(Object.keys(currentCompilation.assets))

  if (!emit) {
    childCompiler.outputFileSystem = {
      mkdir (_p, cb) { cb() },
      writeFile (_p, _c, cb) { cb() },
      stat (_p, cb) { cb(new Error('ENOENT')) }
    }
  }

  childCompiler.runAsChild((error, entries, compilation) => {
    if (error) { return callback(error) }
    if (!entries || entries.length === 0) { return callback(null, null) }
    const firstEntry = entries[0]
    const files = Array.from(firstEntry.files)
    const mainFilename = files[0]
    if (!mainFilename) { return callback(null, null) }
    const asset = compilation.assets[mainFilename] || currentCompilation.assets[mainFilename]
    const source = asset ? asset.source() : ''
    if (!emit) {
      const newAssets = Object.keys(currentCompilation.assets).filter((name) => !beforeAssets.has(name))
      for (const name of newAssets) {
        currentCompilation.deleteAsset(name)
      }
    }
    callback(null, source, null, {
      [COMPILATION_METADATA]: files
    })
  })
}

function getOutputFilename (options, { target, resourcePath }) {
  if (!options) {
    const hash = crypto.createHash('md5').update(resourcePath).digest('hex').substring(0, 20)
    return { filename: `${hash}.${target}.js` }
  }
  if (typeof options === 'string') { return { filename: options } }
  if (typeof options === 'object') {
    return { filename: options.filename }
  }
  throw new Error(`Invalid compile output options: ${options}`)
}
