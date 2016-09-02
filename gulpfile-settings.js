module.exports = {
  path: {
    input: {
      dir: {
        app:           './app',
        style:         './app/css',
        source:        './app/src',
        source_global: './app/src-global'
      },
      file: {
        version:       'version.json',
        main_html:     'index.html'
      }
    },
    output: {
      dir: {
        app:    './dist',
        style:  './dist/css',
        source: './dist/src',
      },
      file: {
        style:     'main.css',
        source:    'main.js',
        main_html: 'index.html'
      }
    }
  }
}

