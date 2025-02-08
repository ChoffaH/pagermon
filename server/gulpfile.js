"use strict";

const gulp = require("gulp");
const sass = require("gulp-sass")(require("sass"));
const shell = require("gulp-shell");
const { parallel } = require("gulp");

gulp.task("icons", function() {
    return gulp.src("node_modules/@fortawesome/fontawesome-free/webfonts/*", {encoding: false})
        .pipe(gulp.dest("./themes/default/public/assets/webfonts/"));
});

gulp.task("sass", function () {
  return gulp.src("./sass/style.scss")
    .pipe(sass({
        loadPaths: ["node_modules"],
        quietDeps: true,
        silenceDeprecations: ["import"],
    }).on("error", sass.logError))
    .pipe(gulp.dest("./themes/default/public/assets/css"));
});

gulp.task("sass:watch", function () {
    gulp.watch("./sass/*.scss", gulp.series("sass"));
});

gulp.task("node", shell.task("node app.js"));

gulp.task("server", gulp.series("sass", "icons", "node"));

gulp.task("default", parallel("sass:watch", "server"));

gulp.task("build", gulp.series("sass"));