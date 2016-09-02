var settings        = require('./gulpfile-settings');
var gulp            = require('gulp');
var rename          = require('gulp-rename');
var watch           = require('gulp-watch');
var server          = require('gulp-server-livereload');
var concat          = require('gulp-concat-util');
var browserify      = require('browserify');
var source          = require('vinyl-source-stream');
var uglify          = require('gulp-uglify');
var buffer          = require('vinyl-buffer');
var sourcemaps      = require('gulp-sourcemaps');
var glob            = require('glob');
var util            = require('gulp-util');
var semver          = require('semver');
var fs              = require('fs');
var proc            = require('child_process');
var chalk           = require('chalk');
var path            = require('path');
var sass            = require('gulp-sass');
var yargs           = require('yargs')
  .usage(' Usage: $0 <command>')
  .command('build', 'Performs build')
  .command('serve', 'Starts localserver with livereload at localhost:8000')
  .command('bump-version', 'Increments the version')
  .demand(1, 'Must provide a valid command'),

  argv = yargs.argv, command = argv._[0];

if ('build' === command || 'serve' === command) {
  argv = yargs.reset().argv;
} else if ('bump-version' === command) {
  argv = yargs.reset()
    .example('$0 bump-version -l patch')
    .default('l', 'patch')
    .alias('l', 'level')
    .choices('l', ['major', 'minor', 'patch', 'premajor', 'preminor', 'prepatch', 'prerelease'])
    .describe('l', 'which level to increment')
    .nargs('l', 1)
    .alias('i', 'id')
    .describe('i', 'identifier to be used to prefix premajor, preminor, prepatch or prerelease version increments')
    .nargs('i', 1)
    .help('h')
    .alias('h', 'help')
    .argv;
} else {
  yargs.showHelp();
}

function relativePath(target) {
  var relative = `${path.relative(__dirname, process.cwd())}`;
  if (relative) relative += "/";
  return relative + target;
}

function buildLibrary(sourceFiles, globals, outputDir, outputFile) {
  var pipes = browserify({
    entries: sourceFiles.filter(function(val) {return -1 == globals.indexOf(val)}),
    extensions: [".coffee", ".js"],
    cwd: __dirname
  })
    .transform("coffeeify", {bare: false})
    .transform("babelify", {presets: ['es2015'], plugins: ["add-module-exports"]})
    .bundle()
    .pipe(source(outputFile))
    .pipe(buffer());

  for(var i=0,l=globals.length; i<l; ++i) {
    pipes.pipe(concat.header(fs.readFileSync(globals[i])));
  }

  pipes
    .pipe(sourcemaps.init({
      loadMaps: true,
    }))
    .pipe(uglify({
      //mangle: false, are we using class names in the code?
      options: {
        sourceMap: true,
      }
    }))
    .pipe(sourcemaps.write("./"))
    .pipe(gulp.dest(outputDir));
}

function buildStyles(sourceFiles, outputDir, outputFile) {
  gulp.src(sourceFiles)
    .pipe(sass({
      errLogToConsole: true
    }))
    .pipe(concat(outputFile))
    .pipe(gulp.dest(outputDir));
}

function build() {
  buildLibrary(
    glob.sync(relativePath(settings.path.input.dir.source) + '/**/*.*'),
    glob.sync(relativePath(settings.path.input.dir.source_global) + '/**/*.*'),
    relativePath(settings.path.output.dir.source), settings.path.output.file.source);

  buildStyles(
    glob.sync(relativePath(settings.path.input.dir.style) + '/**/*.scss'),
    relativePath(settings.path.output.dir.style), settings.path.output.file.style);

  gulp.src(relativePath(settings.path.input.dir.app + '/' + settings.path.input.file.main_html))
    .pipe(rename(settings.path.output.file.main_html))
    .pipe(gulp.dest(relativePath(settings.path.output.dir.app)));
}

gulp.task("bump-version", function() {
  var version = {},
    path = relativePath(settings.input.dir.app + '/' + settings.input.file.version);
  try {
    version = JSON.parse(fs.readFileSync(path, {encoding: "utf-8"}))
  } catch(e) {
  }
  version.semver = semver.inc(version.semver || "0.0.0", `${argv.level}`, `${argv.id}`);
  fs.writeFile(path, `${JSON.stringify(version, null, 2)}`);
  util.log(chalk.blue("\n"+JSON.stringify(version, null, 2)));
});

gulp.task("build", function() {
  build();
});

gulp.task('serve', function() {
  build();

  watch(relativePath(settings.path.input.dir.app) + '/**/*.*', build);

  gulp.src(relativePath(settings.path.output.dir.app))
    .pipe(server({
      livereload: true,
      directoryListing: false,
      open: true
    }));
});
