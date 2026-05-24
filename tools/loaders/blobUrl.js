// Origin https://github.com/peterschussheim/monaco-editor/blob/master/loaders/blobUrl.js
// MIT License Copyright (c) 2018 Peter Schussheim

module.exports = function blobUrl (source) {
  const { type } = this.getOptions() || {}
  return `module.exports = URL.createObjectURL(new Blob([${JSON.stringify(source)}]${type ? `, { type: ${JSON.stringify(type)} }` : ''}));`
}
