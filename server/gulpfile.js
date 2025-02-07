"use strict";

const gulp = require("gulp");
const sass = require("gulp-sass")(require("sass"));
const shell = require("gulp-shell");
const { parallel } = require("gulp");

gulp.task("sass", function () {
  return gulp.src("./sass/style.scss")
    .pipe(sass({
        loadPaths: ['node_modules'],
        quietDeps: true,
        silenceDeprecations: ["import"],
    }).on("error", sass.logError))
    .pipe(gulp.dest("./themes/default/public/stylesheets"));
});

gulp.task("sass:watch", function () {
    gulp.series("sass")();
    gulp.watch("./sass/*.scss", gulp.series("sass"));
});

gulp.task("server", shell.task("node app.js"));

gulp.task("default", parallel("sass:watch", "server"));

gulp.task("build", gulp.series("sass"));