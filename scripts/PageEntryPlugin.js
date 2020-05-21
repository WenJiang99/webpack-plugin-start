"use strict";
const path = require('path');
const fs = require('fs');
const replaceExt = require('replace-ext');
const globby = require('globby');
const SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin');
const MultiEntriesPlugin = require('webpack/lib/MultiEntryPlugin');

class PageEntryPlugin {
  constructor(options) {
    this.pageDir = (options && options.pageDir) || 'pages';
    this.appRoot = '';
    this.ext = '';
    this.entries = [];
    this.context = null;
  }
  apply(compiler) {
    const options = compiler && compiler.options;
    const entry = options && options.entry;
    this.context = options && options.context;
    this.resolveEntries(this.context, entry, this.entries)

    compiler.hooks.entryOption.tap('PageEntryPlugin', (compilation) => {
      this.entries.forEach(item => {
        toEntryPlugin(this.context, item.path, item.name).apply(compiler)
      })
      return true; // 阻止后面继续处理entry生成main.js
    })
  }


  resolveEntries(context, entry, target = []) {
    this.addEntry(this.entries, entry)
    this.ext = path.extname(entry)
    this.appRoot = path.dirname(path.resolve(__dirname, context, entry))
    const posixAppRoot = this.appRoot.replace(new RegExp(`\\${path.sep}`, 'g'), path.posix.sep) // globby 只能查找正向斜杠 / 
    const pagesRootName = path.posix.join(posixAppRoot, this.pageDir)
    this.getPageEntryList(pagesRootName, target, path.extname(entry), this.ext)
  }

  /**
   * 遍历pageDir页面得到所有页面入口entry
   * @param {String} pagesRootName 页面所在的目录路径
   * @param {*} target 存放entryList的数组
   * @param {*} ext 入口文件扩展名
   */
  getPageEntryList(pagesRootName, target = [], ext = '.js') {
    const pattern = `${pagesRootName}/**/*${ext}`;
    const pageList = globby.sync([pattern]);
    pageList.forEach(item => {
      this.getPageEntry(item, target)
    })
  }

  /**
   * 从当前页面文件pages/xxx/xxx.js路径中提取到相对于app.js入口所在目录的路径，得到entry的name、path
   * @param {String} pageEntryFile  页面目录所在的路径
   * @param {Array} target 存放entry的数组
   */
  getPageEntry(pageEntryFile, target = []) {
    const relativeToContextPath = path.relative(this.context, pageEntryFile)
    const dirname = path.dirname(relativeToContextPath)
    const pageName = dirname.split(path.sep).pop(); // 生成与目录名相同的 js 文件
    this.addEntry(target, `./${relativeToContextPath}`, `${dirname}/${pageName}`)
  }

  /**
   * 添加entry 到 entries
   * @param {Array} entries 用于汇总所有entries的数组
   * @param {String} entryPath 单个entry,相对于 `context`的相对路径
   */
  addEntry(entries = [], entryPath, entryName) {
    const entry = this.formatEntry(entryPath, entryName)
    if (path.extname(entryPath) === this.ext) {
      this.getComponentsEntries(entries, entryPath, this.ext)
    }
    if (entryPath && !entries.includes(entry)) {
      entries.push(entry);
    }
  }

  formatEntry(entryPath, entryName) {
    entryPath = String(entryPath)
    if (entryName) {
      return {
        name: entryName,
        path: entryPath
      }
    } else {
      const sep = entryPath.indexOf('/') > -1 ? '/' : '\\';
      const name = entryPath.split(sep).pop().split('.')[0]
      return {
        name,
        path: entryPath
      }
    }
  }

  getComponentsEntries(target, file, ext = '.js') {
    const resolvedFile = path.resolve(this.context, file)
    const configFile = replaceExt(resolvedFile, '.json');
    let config;
    try {
      // json文件可能不存在
      config = JSON.parse(fs.readFileSync(configFile, { encoding: 'utf-8' }));
    } catch (error) {
      // console.error(`parse config file error ==> `, error)
      config = '';
    }
    if (!config || !config.usingComponents) return;
    const components = config.usingComponents;
    for (let k in components) {
      let filePath = components[k];
      // 引用组件路径时候都是不带扩展名，需要加上 js 后缀来指定入口文件后缀
      filePath = replaceExt(filePath, ext)
      // 以 / 开头的目录是相对于 app.js 所在目录的路径
      if (filePath[0] !== '.') {
        filePath = path.join(this.appRoot, filePath)
        filePath = path.relative(this.context, filePath)
        this.addEntry(target, `./${filePath}`, replaceExt(filePath, ''))
      } else {
        this.addEntry(target, filePath, replaceExt(filePath, ''))
      }
    }
  }
}

/**
 * 把entry应用到配置文件中
 */
const toEntryPlugin = (context, entry, name) => {
  return Array.isArray(entry) ? new MultiEntriesPlugin(context, entry, name) : new SingleEntryPlugin(context, entry, name);
}

module.exports = PageEntryPlugin;