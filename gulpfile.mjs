import { src, dest, watch, series, parallel } from "gulp";

// SCSS関連モジュール
import sass from "gulp-dart-sass";
import sassGlob from "gulp-sass-glob";
import plumber from "gulp-plumber";
import notify from "gulp-notify";
import cleanCSS from "gulp-clean-css";
import rename from "gulp-rename";
import sourcemaps from "gulp-sourcemaps";
import postcss from "gulp-postcss";
import autoprefixer from "autoprefixer";
import mqpacker from "css-mqpacker";
import cssnext from "postcss-cssnext";
import prettier from "gulp-prettier";

// Pug関連モジュール
import pug from "gulp-pug";

// JS関連モジュール
import babel from "gulp-babel";
import uglify from "gulp-uglify";

// 画像圧縮関連モジュール
import imagemin from "gulp-imagemin";
import imageminMozjpeg from "imagemin-mozjpeg";
import imageminPngquant from "imagemin-pngquant";
import imageminSvgo from "imagemin-svgo";

// ブラウザ同期
import browserSync from "browser-sync";
const bs = browserSync.create();

//postcss-cssnext ブラウザ対応条件 prefix 自動付与
const browsers = [
  "last 2 versions",
  "> 5%",
  "ie = 11",
  "not ie <= 10",
  "ios >= 8",
  "and_chr >= 5",
  "Android >= 5",
];

//参照元パス
const srcPath = {
  css: "src/assets/scss/**/**.scss",
  js: "src/assets/js/*.js",
  img: "src/assets/images/**/*",
  pug: "src/**/*.pug",
  php: "src/**/*.php",
};

//出力先パス
const destPath = {
  css: "dist/assets/css/",
  js: "dist/assets/js/",
  img: "dist/assets/images/",
  html: "dist/",
  php: "dist/",
};

//sass
const cssSass = () => {
  return src(srcPath.css) //コンパイル元
    .pipe(sourcemaps.init()) //gulp-sourcemapsを初期化
    .pipe(
      plumber(
        //エラーが出ても処理を止めない
        {
          errorHandler: notify.onError("Error:<%= error.message %>"),
          //エラー出力設定
        }
      )
    )
    .pipe(sassGlob())
    .pipe(
      sass
        .sync({
          includePaths: ["node_modules", "src/sass"], //パスを指定
          outputStyle: "expanded",
        })
        .on("error", sass.logError)
    )
    .pipe(sass({ outputStyle: "expanded" }))
    .pipe(postcss([autoprefixer(), mqpacker()])) // 修正: autoprefixerを追加
    .pipe(postcss([mqpacker()])) // メディアクエリを圧縮
    .pipe(postcss([cssnext(browsers)])) //cssnext
    .pipe(sourcemaps.write("/maps")) //ソースマップの出力
    .pipe(cleanCSS()) // CSS圧縮
    .pipe(
      rename({
        extname: ".min.css", //.min.cssの拡張子にする
      })
    )
    .pipe(dest(destPath.css)) //コンパイル先
    .pipe(browserSync.stream());
};

// Pugのコンパイル
const pugCompile = () => {
  return src("src/views/**/*.pug")
    .pipe(
      plumber({
        errorHandler: notify.onError("Error:<%= error.message %>"),
      })
    )
    .pipe(
      pug({
        pretty: true, // HTMLを整形
        basedir:"src/views"
      })
    )
    .pipe(prettier()) // Prettier を適用
    .pipe(dest(destPath.html))
    .pipe(browserSync.stream());
};

// babelのトランスパイル、jsの圧縮
const jsBabel = () => {
  return src(srcPath.js)
    .pipe(
      plumber({
        errorHandler: notify.onError("Error: <%= error.message %>"),
      })
    )
    .pipe(
      babel({
        presets: ["@babel/preset-env"], // gulp-babelでトランスパイル
      })
    )
    .pipe(dest(destPath.js))
    .pipe(uglify()) // js圧縮
    .pipe(rename({ extname: ".min.js" }))
    .pipe(dest(destPath.js));
};

//画像圧縮
const imgImagemin = () => {
  return src(srcPath.img)
    .pipe(
      imagemin(
        [
          imageminMozjpeg({
            quality: 80,
          }),
          imageminPngquant(),
          imageminSvgo({
            plugins: [
              {
                removeViewbox: false,
              },
            ],
          }),
        ],
        {
          verbose: true,
        }
      )
    )
    .pipe(dest(destPath.img));
};

//ブラウザリロード
const browserSyncFunc = () => {
  browserSync.init(browserSyncOption);
};

const browserSyncOption = {
  server: destPath.html,
};

/**
 * リロード
 */
const browserSyncReload = (done) => {
  browserSync.reload();
  done();
};

/**
 *
 * ファイル監視
 */
const watchFiles = () => {
  watch(srcPath.css, series(cssSass, browserSyncReload));
  watch(srcPath.js, series(jsBabel, browserSyncReload));
  watch(srcPath.img, series(imgImagemin, browserSyncReload));
  watch(srcPath.pug, series(pugCompile, browserSyncReload));
};

export default series(
  series(cssSass, jsBabel, imgImagemin, pugCompile),
  parallel(watchFiles, browserSyncFunc)
);
