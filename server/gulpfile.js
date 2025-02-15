"use strict";

const gulp = require("gulp");
const environments = require('gulp-environments');
const sass = require("gulp-sass")(require("sass"));
const shell = require("gulp-shell");
const { parallel } = require("gulp");

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

gulp.task("node", shell.task("node app.js"));
gulp.task("server", gulp.series("fa-fonts", "fa-sass", "sass", "node"));
gulp.task("default", parallel("sass:watch", "server"));
gulp.task("build", gulp.series("fa-fonts", "fa-sass", "sass"));