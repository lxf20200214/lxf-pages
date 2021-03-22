// 实现这个项目的构建任务
const { src, dest, parallel, series, watch } = require('gulp')

// 文件清除,不是gulp的插件
const del = require('del')
// 开发服务器 热更新
const browserSync = require('browser-sync')


// 插件集体导入
const loadPlugins=require('gulp-load-plugins')
const plugins=loadPlugins()

// 创建开发服务器
const bs = browserSync.create()

// 工作目录
const cwd=process.cwd()

let config={
    //default config
    build:{
        src:'src',
        dist:'dist',
        temp:'temp',
        public:'public',
        paths:{
            styles:'assets/styles/*.scss',
            scripts:'assets/scripts/*.js',
            pages:'*.html',
            images:'assets/images/**',
            fonts:'assets/fonts/**'
        }
    }
}

try {
    const loadConfig = require(`${cwd}/pages.config.js`)
    config = Object.assign({},config, loadConfig)
} catch(e){

}


// sass转换插件gulp-sass
// const sass =require('gulp-sass')
// js转换插件babel
// const babel = require('gulp-babel')
// swig转换插件
// const swig=require('gulp-swig')
//图片处理插件
// const imagemin = require('gulp-imagemin')


//模板数据
// const data = 

//文件清除
const clean = ()=>{
  return del([config.build.dist,config.build.temp])
}

//样式编译
const style = () =>{
    return src(config.build.paths.styles,{ base: config.build.src,cwd:config.build.src})
        .pipe(plugins.sass({ outputStyle:'expanded' }))
        .pipe(dest(config.build.temp))
        .pipe(bs.reload({ stream: true }))
}

// 脚本编译
const script = ()=>{
    return src(config.build.paths.scripts,{ base: config.build.src,cwd:config.build.src})
        .pipe(plugins.babel({ presets: [require('@babel/preset-env')]}))
        .pipe(dest(config.build.temp))
        .pipe(bs.reload({ stream: true }))
}

//页面模板编译
const page = ()=>{
    return src(config.build.paths.pages,{ base: config.build.src,cwd:config.build.src})
        // .pipe(plugins.swig({ data }))
        .pipe(plugins.swig({ data:config.data, defaults: { cache: false } })) // 防止模板缓存导致页面不能及时更新
        .pipe(dest(config.build.temp))
        .pipe(bs.reload({ stream: true }))
}

//图片转换
const image = ()=>{
    return src(config.build.paths.images,{ base: config.build.src,cwd:config.build.src})
        .pipe(plugins.imagemin())
        .pipe(dest(config.build.dist))
}

//字体文件处理
const font = ()=>{
  return src(config.build.paths.fonts,{ base: config.build.src,cwd:config.build.src})
      .pipe(plugins.imagemin())
      .pipe(dest(config.build.dist))
}

//其他文件拷贝
const extra = ()=>{
  return src('**', { base: config.build.public,cwd:config.build.src})
    .pipe(dest(config.build.dist))
}

// 服务器任务
const serve = ()=>{
  watch(config.build.paths.styles,{ cwd:config.build.src},style)
  watch(config.build.paths.scripts,{ cwd:config.build.src},script)
  watch(config.build.paths.pages,{ cwd:config.build.src},page)
  // watch('src/assets/images/**',image)
  // watch('src/assets/fonts/**',font)
  // watch('public/**',extra)
  watch([
    config.build.paths.images,
    config.build.paths.fonts,
  ], {cwd:config.build.src},bs.reload)

  watch('**',{cwd:config.build.public},bs.reload)

  bs.init({
    notify:false,  
    port:2080,  //端口号
    //open:false,  //自动打开浏览器
    // files:'dist/**',  //可以使用bs.reload代替
    server:{
      baseDir:[config.build.temp,config.build.src,config.build.public],
      routes:{
        '/node_modules':'node_modules' 
      }
    }
  })
}

// useref文件引用处理任务
const useref = ()=>{
  return src(config.build.paths.pages, { base: config.build.temp,cwd:config.build.temp })
    .pipe(plugins.useref({ searchPath: [config.build.temp, '.'] }))
    //html,css,js压缩
    .pipe(plugins.if(/\.js$/,plugins.uglify()))
    .pipe(plugins.if(/\.css$/,plugins.cleanCss()))
    .pipe(plugins.if(/\.html$/,plugins.htmlmin({ 
      collapseWhitespace: true,
      minifyCSS:true,
      minifyJS: true,
    })))
    .pipe(dest(config.build.dist))
}

const compile = parallel(style, script, page)

// 上线之前执行的任务
const build = series(
  clean, 
  parallel(
    series(compile,useref), 
    image, 
    font, 
    extra
  )
)

const develop = series(compile, serve)

module.exports = {
    // compile,
    build,
    clean,
    // image,
    // serve,
    develop
    // useref
}