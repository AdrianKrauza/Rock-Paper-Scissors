import gulp from 'gulp'
import sass from 'gulp-sass'
import del from 'del'
import browserSync from 'browser-sync'
import sourcemaps from 'gulp-sourcemaps'
import autoprefixer from 'gulp-autoprefixer'
import CleanCSS from 'gulp-clean-css'
import terser from 'gulp-terser'
import concat from 'gulp-concat'
import changed from 'gulp-changed'
import imagemin from 'gulp-imagemin'
import htmlMin from 'gulp-htmlmin'
import htmlReplace from 'gulp-html-replace'
import babel from 'gulp-babel'

var config = {
  dist: 'dist/',
  src: 'src/',
  cssin: 'src/css/**/*.css',
  jsin: 'src/js/**/*.js',
  imgin: 'src/img/**/*.{jpg,jpeg,png,gif}',
  htmlin: 'src/*.html',
  scssin: 'src/scss/**/*.scss',
  cssout: 'dist/css/',
  jsout: 'dist/js/',
  imgout: 'dist/img/',
  htmlout: 'dist/',
  scssout: 'src/css/',
  cssoutname: 'style.css',
  jsoutname: 'script.js',
  cssreplaceout: 'css/style.css',
  jsreplaceout: 'js/script.js'
};

gulp.task('sass', function () {
  return gulp.src([config.scssin])

    .pipe(sourcemaps.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: ['last 3 versions']
    }))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest([config.scssout]))
    .pipe(browserSync.stream());

});
gulp.task('css', function () {
  return gulp.src([config.cssin])
  .pipe(concat(config.cssoutname))
    .pipe(CleanCSS())
    .pipe(gulp.dest([config.cssout]))
});

gulp.task('js', function() {
  return gulp.src(config.jsin)
  .pipe(babel({
    presets: ['env']
}))
    .pipe(concat(config.jsoutname))
    .pipe(terser())
    .pipe(gulp.dest(config.jsout));
});
gulp.task('img', function() {
  return gulp.src(config.imgin)
    .pipe(changed(config.imgout))
    .pipe(imagemin())
    .pipe(gulp.dest(config.imgout));
});

gulp.task('html', function () {
  return gulp.src([config.htmlin])
    .pipe(htmlReplace({
      'css': [config.cssreplaceout],
      'js': [config.jsreplaceout]
    }))
    .pipe(htmlMin({
      sortAttributes: true,
      sortClassName: true,
      collapseWhitespace: true
    }))
    .pipe(gulp.dest([config.dist]))
});

gulp.task('clean', function () {
  return del([config.dist]);
});

gulp.task('build', gulp.series('clean', gulp.parallel('html', 'css', 'js', 'img')));



gulp.task('reload', function () {
  browserSync.reload();
});

gulp.task('serve', gulp.series('sass', function () {

  browserSync({
    server: 'src'
  })
  gulp.watch([config.htmlin,config.jsin]).on('change', browserSync.reload);
  gulp.watch([config.scssin], gulp.series('sass'))
}));

gulp.task('default', gulp.series('serve'));