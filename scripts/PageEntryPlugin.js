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
}

/**
 * 把entry应用到配置文件中
 */
const toEntryPlugin = (context, entry, name) => {
  return Array.isArray(entry) ? new MultiEntriesPlugin(context, entry, name) : new SingleEntryPlugin(context, entry, name);
}

module.exports = PageEntryPlugin;