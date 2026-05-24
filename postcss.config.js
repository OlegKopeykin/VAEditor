const alter = require('postcss-alter-property-value')
const autoprefixer = require('autoprefixer')

module.exports = {
  plugins: [
    autoprefixer({
      overrideBrowserslist: ['safari >= 11', 'chrome >= 63', '> 1%'],
      extensions: ['.css']
    }),
    alter({
      declarations: {
        // exclude unsupported 1c webkit css modifier
        // to fix non-displayed cursor on mouse over at line numbers
        cursor: {
          task: 'remove',
          whenRegex: {
            value: '-webkit-image-set'
          }
        }
      }
    })
  ]
}
