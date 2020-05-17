# Webpack Plugin Start

## Description

仓库主要用于入门编写一个 `webpack`插件 ，插件的用途是自动遍历`entry`文件所在目录的`pages`目录，并将所有页面注册为 `entry`。

插件的应用场景是小程序的页面注册。

## 关于Webpack Plugin

> webpack **插件**是一个具有 [`apply`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/apply) 方法的 JavaScript 对象。`apply` 方法会被 webpack compiler 调用，并且 compiler 对象可在**整个**编译生命周期访问

就是说 **webpack plugin** 就是一个**javascript Object** ，并且需要有一个 `apply` 方法来 webpack **compiler** 调用

### apply方法

`apply` 方法是 webpack插件的 **核心** ，是接入到webpack编译过程的入口。

`apply` 方法接收一个 `compiler` 参数，这个 `compiler` 参数就相当于是 **webpack** 实例，包含了完整的 **webpack 配置**

### compiler hooks

`compiler hooks` 就是 webpack 编译器在编译过程中会触发的一些 **钩子** ，通过这些**钩子** 可以使得我们的插件能够在特定的编译周期中执行一些处理操作。

详细的`hooks` 介绍可以查看[官方文档](https://webpack.docschina.org/api/compiler-hooks/)

## 相关准备

### 初始化

`npm init -y` 初始化目录
`npm install webpack webpack-cli clean-webpack-plugin -D` 安装依赖


### 目录结构

```
│  .gitignore
│  package-lock.json
│  package.json
│  README.md
│  
├─dist
│  │  main.js
│  │  
│  └─pages
│      ├─home
│      │      index.js
│      │      
│      └─login
│              index.js
│              
├─scripts
│      PageEntryPlugin.js
│      webpack.config.js
│      
└─src
    │  app.js
    │  
    ├─lib
    │  ├─common
    │  │      log.js
    │  │      test.js
    │  │      
    │  └─utils
    └─pages
        ├─home
        │      index.js
        │      
        └─login
                index.js
```

### 配置webpack

这里我们主要为了入门写一个插件，因此不对`webpack`配置做过多介绍，具体配置也简单的配置了 `entry`,`output`,`plugins` 等简单的配置。

配置文件和插件文件放在 `scripts`目录，以`src/app.js`作为项目 `entry`，具体配置如下

```js
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const PageEntryPlugin = require('./PageEntryPlugin')
const src = path.resolve(__dirname, '../src')
module.exports = {
  context: src,
  entry: './app.js',
  output: {
    filename: "[name].js",
    path: path.resolve('dist')
  },
  mode: 'development',
  plugins: [
    new CleanWebpackPlugin(),
    new PageEntryPlugin({ pageDir: 'pages' })
  ]
}
```

上面的 `PageEntryPlugin`就是我们编写的插件。现在我们开始动手编写插件

## 插件编写

首先要清楚我们的插件要做什么事情，以及具体的思路。
在这个简单的demo里面，我们的插件要做的就是一件事，在`webpack`处理完 `entry`配置项后，会触发 `entryOption`钩子，我们的插件就通过`tap`这个钩子，然后获取到配置文件的`entry`和`context`.

获取到`entry`和 `context`后便可以得到`entry`文件所在的目录，然后我们遍历这个目录下的 `pageDir`的文件获取到所有页面入口文件，然后将其加入成为 `entry`

弄清楚要做什么、怎么做之后，我们便可以开始敲代码了。

### 完整代码

首先先给出完整的代码

```js
const path = require('path');
const globby = require('globby');
const SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin');
const MultiEntriesPlugin = require('webpack/lib/MultiEntryPlugin');

class PageEntryPlugin {
  constructor(options) {
    this.pageDir = (options && options.pageDir) || 'pages';
    this.entries = [];
    this.context = null;
  }
  apply(compiler) {
    const options = compiler && compiler.options;
    const entry = options && options.entry;
    this.context = options && options.context;
    let dirname = path.dirname(path.resolve(__dirname, this.context, entry))
    dirname = dirname.replace(new RegExp(`\\${path.sep}`, 'g'), path.posix.sep)
    const pageDirname = path.posix.join(dirname, this.pageDir)
    this.getPageEntryList(pageDirname, this.entries, path.extname(entry))

    compiler.hooks.entryOption.tap('PageEntryPlugin', (compilation) => {
      this.entries.forEach(item => {
        toEntryPlugin(this.context, item.path, item.name).apply(compiler)
      })
    })
  }

  getPageEntry(pageDirname, target = []) {
    const relativePath = path.relative(this.context, pageDirname)
    const dirname = path.dirname(relativePath)
    target.push({
      path: `./${relativePath}`,
      name: `${dirname}/index`
    })
  }

  /**
   * 
   * @param {String} dirname 页面所在的目录路径
   * @param {*} target 存放entryList的数组
   * @param {*} ext 入口文件扩展名，暂时先不做扩展，固定成 `.js`
   */
  getPageEntryList(dirname, target = [], ext = '.js') {
    const pattern = `${dirname}/**/*${ext}`;
    const pageList = globby.sync([pattern]);
    pageList.forEach(item => {
      this.getPageEntry(item, target)
    })
  }
}

/**
 * 把entry应用到配置文件中
 */
const toEntryPlugin = (context, entry, name) => {
  return Array.isArray(entry) ? new MultiEntriesPlugin(context, entry, name) : new SingleEntryPlugin(context, entry, name);
}

module.exports = PageEntryPlugin;
```

### 具体实现

上面我们的插件是一个 `class`，构造器接收一个 `options`，这个参数就是配置文件中我们向插件传递的参数，这里我们可以传递一个 `pageDir`来指定存放页面的目录名称

```js
  constructor(options) {
    this.pageDir = (options && options.pageDir) || 'pages';
    this.entries = [];
    this.context = null;
  }
```

插件的核心是遍历 `pageDir`获取到所有的页面入口，

这里文件遍历我们采用的是[globby](https://www.npmjs.com/package/globby)函数库，当然你也可以用其他方法

其实现具体如下：

```js
  /**
   * 从当前页面文件路径中提取到相对于 `context`的路径，得到entry的name、path
   * @param {String} pageDirname  页面目录所在的路径
   * @param {Array} target 存放entry的数组
   */
  getPageEntry(pageDirname, target = []) {
    const relativePath = path.relative(this.context, pageDirname)
    const dirname = path.dirname(relativePath)
    target.push({
      path: `./${relativePath}`,
      name: `${dirname}/index`
    })
  }

  /**
   * 遍历pageDir页面得到所有页面入口entry
   * @param {String} dirname 页面所在的目录路径
   * @param {*} target 存放entryList的数组
   * @param {*} ext 入口文件扩展名，暂时先不做扩展，固定成 `.js`
   */
  getPageEntryList(dirname, target = [], ext = '.js') {
    const pattern = `${dirname}/**/*${ext}`;
    const pageList = globby.sync([pattern]);
    pageList.forEach(item => {
      this.getPageEntry(item, target)
    })
  }
```

然后就只需要注册一下这些entry就OK了

```js
  apply(compiler) {
    const options = compiler && compiler.options;
    const entry = options && options.entry;
    this.context = options && options.context;
    let dirname = path.dirname(path.resolve(__dirname, this.context, entry))

    // globby 只能遍历正向斜杆 /，如果是反向斜杠 \ 要替换一下
    dirname = dirname.replace(new RegExp(`\\${path.sep}`, 'g'), path.posix.sep)
    const pageDirname = path.posix.join(dirname, this.pageDir)
    this.getPageEntryList(pageDirname, this.entries, path.extname(entry))

    compiler.hooks.entryOption.tap('PageEntryPlugin', (compilation) => {
      this.entries.forEach(item => {
        toEntryPlugin(this.context, item.path, item.name).apply(compiler)
      })
    })
  }
```