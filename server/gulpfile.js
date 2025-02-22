"use strict";

const gulp = require("gulp");
const environments = require('gulp-environments');
const sass = require("gulp-sass")(require("sass"));
const shell = require("gulp-shell");
const { parallel } = require("gulp");
const minify = require('gulp-minify');

const production = environments.production;

const sassOptions = {
  loadPaths: ["node_modules"],
  quietDeps: true,
  silenceDeprecations: ["import"],
  errLogToConsole: true,
  style: production() ? "compressed" : "expanded",
};

gulp.task("fa-fonts", function() {
  return gulp.src("node_modules/@fortawesome/fontawesome-free/webfonts/*", {encoding: false})
    .pipe(gulp.dest("./themes/default/public/assets/webfonts/"));
});

gulp.task("fa-sass", function () {
  return gulp.src("./sass/fa.scss")
    .pipe(sass(sassOptions))
    .pipe(gulp.dest("./themes/default/public/assets/css"));
});

gulp.task("sass", function () {
  return gulp.src("./sass/style.scss")
    .pipe(sass(sassOptions))
    .pipe(gulp.dest("./themes/default/public/assets/css"));
});

gulp.task("sass:watch", function () {
  gulp.watch("./sass/*.scss", gulp.series("sass"));
});

gulp.task('vendor-js', function() {
  return gulp.src(['vendor/*.js'])
    .pipe(minify())
    .pipe(gulp.dest('themes/default/public/assets/js'))
});

gulp.task("vendor-js:watch", function () {
  gulp.watch("./vendor/*.js", gulp.series("vendor-js"));
});

gulp.task("node", shell.task("node app.js"));
gulp.task("server", gulp.series("fa-fonts", "fa-sass", "sass", "vendor-js", "node"));
gulp.task("default", parallel("sass:watch", "vendor-js:watch", "server"));
gulp.task("build",  gulp.series("fa-fonts", "fa-sass", "sass", "vendor-js"));