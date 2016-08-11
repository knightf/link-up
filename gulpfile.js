var gulp = require('gulp'),
    webpack = require('webpack'),
    concat = require('gulp-concat'),
    del = require('del'),
    rename = require('gulp-rename'),
    uglify = require('gulp-uglify'),
    gutil = require('gulp-util'),
    path = require('path');

var pgen = function(rp) {
  return path.join(__dirname, rp);
};

var SKETCH_FOLDER = '/Users/feihan/Library/Application\ Support/com.bohemiancoding.sketch3/Plugins/Link-Up.sketchplugin/Contents/Sketch/';

var paths = {
  distFolder: pgen('dist/'),
  distFiles: pgen('dist/**/*.*'),
  distJs: pgen('dist/main.js'),
  jsEntryFolder: pgen('src/js/'),
  jsEntryFile: pgen('src/js/index.js'),
  jsExposeFile: pgen('src/expose.js'),
  jsTempFile: pgen('dist/main.temp.js'),
  manifestFile: pgen('src/manifest.json'),
  pluginFolder: pgen('link-up.sketchplugin/Contents/Sketch/'),
};

gulp.task('clean', del.bind(null, paths.distFiles));

gulp.task('webpack', ['clean'], function(cb) {
  webpack({
    context: paths.jsEntryFolder,
    entry: paths.jsEntryFile,
    output: {
      path: paths.distFolder,
      filename: 'main.temp.js',
    },
    resolve: {
      root: path.jsEntryFolder,
      extensions: ['', '.js'],
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env': {
          'NODE_ENV': JSON.stringify(process.env.NODE_ENV),
        }
      })
    ],
  }, function(e, stat) {
    if (e) {
      throw new gutil.PluginError('webpack', e);
    }
    gutil.log(stat.toString({
      colors: true,
      chunks: false,
    }));
    cb();
  });
});

gulp.task('compile', ['webpack'], function(cb) {
  return gulp.src([paths.jsTempFile, paths.jsExposeFile])
    .pipe(concat('main.js'))
    .pipe(gulp.dest(paths.distFolder), cb);
});

gulp.task('copy:manifest', function(cb) {
  return gulp.src(paths.manifestFile)
    .pipe(gulp.dest(SKETCH_FOLDER), cb);
});

gulp.task('copy:js', ['compile'], function(cb) {
  return gulp.src(paths.distJs)
    .pipe(gulp.dest(SKETCH_FOLDER), cb);
});

gulp.task('copy:publish', ['compile'], function(cb) {
  return gulp.src([paths.distJs, paths.manifestFile])
    .pipe(gulp.dest(paths.pluginFolder), cb);
});

gulp.task('default', ['copy:js', 'copy:manifest'], function() {
  gulp.watch('src/**/*.js', ['copy:js']);
  gulp.watch('src/manifest.json', ['copy:manifest']);
});

