import fs from 'fs';
import path from 'path';
import events from 'events';
import crypto from 'crypto';

class Options {
  constructor(options) {
    let result = Object.assign({}, options);
    result.name = result.name || "index.js";
    result.type = result.type || "esm";
    return Object.assign(this, result);
  }

}

const FLAG_STRING = "// QI-AUTO-EXPORT";
/**
 * This module can check files if is the same before and after written,
 * so that it can reduce the frequency of disk written, and also solved the issue of `rollup` endlessly rebuild.
 */

class Writeable {
  constructor() {
    this.cacheMap = {};
  }

  loadCacheFromFile(targetPath) {
    if (!fs.existsSync(targetPath)) return;
    let data = fs.readFileSync(targetPath).toString();
    let hash = crypto.createHash("md5");
    hash.update(data);
    let result = hash.digest("hex");
    this.cacheMap[targetPath] = result;
  }

  check(data, targetPath) {
    if (!data || !targetPath) {
      return false;
    }

    if (data.slice(0, 17) != FLAG_STRING) {
      return false;
    }

    let hash = crypto.createHash("md5");
    let cache = this.cacheMap[targetPath];
    hash.update(data);
    let result = hash.digest("hex");

    if (!cache || cache != result) {
      this.cacheMap[targetPath] = result;
      return true;
    } else {
      this.cacheMap[targetPath] = result;
      return false;
    }
  }

  cleanCache() {
    this.cacheMap = {};
  }

}

class EventHandler {
  constructor() {
    this.eventList = {};
  }

  register(eventName, callback) {
    if (!this.eventList[eventName]) {
      this.eventList[eventName] = [];
    }

    this.eventList[eventName].push(callback);
  }

  unregister(eventName, callback) {
    for (let i in this.eventList[eventName]) {
      if (this.eventList[eventName][i] === callback) {
        this.eventList[eventName].splice(i, 1);
        break;
      }
    }
  }

  dispatch(eventName, ...args) {
    for (let i in this.eventList[eventName]) {
      this.eventList[eventName][i].apply({}, args);
    }
  }

}

function extractData (data, args) {
  if (typeof data == "function") {
    return data(args);
  } else {
    return data;
  }
}

var Utils = {
  eventHandler: EventHandler,
  extractData
};

const FLAG_STRING$1 = "// QI-AUTO-EXPORT";

class Exporter {
  // Backup user's options
  // Import and Export code generator
  // main
  constructor(options) {
    this._options = null;
    this._import = null;
    this._export = null;
    this._directorys = [];
    this._throttle = {};
    this._fsWacherMap = {};
    this._writeable = new Writeable();
    this._events = new events.EventEmitter();
    this.addEventListener = this._events.on.bind(this._events);
    this.removeEventListener = this._events.off.bind(this._events);
    this.once = this.run;
    this._options = Object.assign({}, options);

    if (this._options.type == "esm") {
      this._import = function (name, path) {
        return `import ${name} from "${path}";`;
      };
    } else {
      this._import = function (name, path) {
        return `const ${name} = require("${path}");`;
      };
    }

    this._export = function (name, object) {
      if (name == object || object === undefined) {
        return `${name},`;
      } else {
        return `${name}:${object},`;
      }
    };
  }

  addDirectorys(dirs) {
    if (Array.isArray(dirs)) {
      this._cleanDirectorys(dirs);
    } else if (typeof dirs == "string") {
      this._cleanDirectorys([dirs]);
    }
  }

  run() {
    for (let i in this._directorys) {
      let p = this._directorys[i];

      this._generate(p).then(data => {
        this._writeFiles(path.resolve(p, this._options.name), data);
      });
    }
  } // Deprecated


  watch() {
    for (let i in this._directorys) {
      let p = this._directorys[i];

      this._generate(p).then(data => {
        this._writeFiles(path.resolve(p, this._options.name), data);
      });

      let watcher = fs.watch(p, {
        recursive: true
      });
      watcher.addListener("change", (() => {
        return async (type, filename) => {
          if (filename == this._options.name) {
            return;
          }

          this._generate(p).then(data => {
            this._writeFiles(path.resolve(p, this._options.name), data);
          });
        };
      })());

      if (!this._fsWacherMap[p]) {
        this._fsWacherMap[p] = watcher;
      }
    }
  }

  stop() {
    for (let i in this._fsWacherMap) {
      this._fsWacherMap[i].close();

      this._fsWacherMap[i] = null;
      delete this._fsWacherMap[i];
    }
  }

  _cleanDirectorys(files) {
    for (let i in files) {
      let p = files[i];

      if (!fs.statSync(p).isDirectory()) {
        p = path.dirname(p);
      }

      if (this._directorys.indexOf(p) == -1) {
        this._directorys.push(p);
      }
    }

    this._directorys.sort((a, b) => {
      return b.length - a.length;
    });
  }

  _readFlag(filepath) {
    return new Promise((resolve, reject) => {
      let stream = fs.createReadStream(filepath, {
        start: 0,
        end: 16
      });
      stream.on("data", data => {
        resolve(data.toString());
        stream.close();
      });
      stream.on("error", err => {
        reject(err);
      });
      stream.read(16);
    });
  }

  async _generate(dir) {
    let entryFilePath = path.resolve(dir, this._options.name);

    if (fs.existsSync(entryFilePath)) {
      let flag = await this._readFlag(entryFilePath);

      if (flag != FLAG_STRING$1) {
        return null;
      } else {
        this._writeable.loadCacheFromFile(entryFilePath);
      }
    }

    let files = fs.readdirSync(dir, {
      withFileTypes: true
    });
    let result = {
      imports: [],
      exports: []
    };

    for (let i in files) {
      let f = files[i];

      if (f.name == this._options.name) {
        continue;
      }

      let extname = path.extname(f.name);
      let basename = path.basename(f.name, extname);

      if (f.isDirectory()) {
        if (fs.existsSync(path.resolve(dir, f.name, this._options.name))) {
          result.imports.push({
            importName: basename,
            importPath: "./" + f.name + "/" + this._options.name
          });
          result.exports.push({
            exportName: basename,
            moduleName: basename
          });
        }
      } else {
        result.imports.push({
          importName: basename,
          importPath: "./" + f.name
        });
        result.exports.push({
          exportName: basename,
          moduleName: basename
        });
      }
    }

    return result;
  }

  _writeFiles(filepath, content) {

    if (this._throttle[filepath]) {
      clearTimeout(this._throttle[filepath]);
    }

    if (!content) {
      return false;
    }

    let c = content;

    if (!c || !c.imports.length || !c.exports.length) {
      return false;
    }

    let context = {
      directory: path.dirname(filepath),
      imports: c.imports,
      exports: c.exports,
      defaultImports: "",
      defaultExports: ""
    };
    let result = "";
    let importStrings = "";
    let exportStrings = "";

    if (this._options.type == "esm") {
      exportStrings += "export default {\n";
    } else {
      exportStrings += "module.exports = {\n";
    }

    for (let i in c.imports) {
      importStrings += this._import(c.imports[i].importName, c.imports[i].importPath) + "\n";
      exportStrings += "    " + this._export(c.exports[i].exportName, c.exports[i].moduleName) + "\n";
    }

    exportStrings += "}";
    context.defaultImports = importStrings;
    context.defaultExports = exportStrings;
    result += FLAG_STRING$1 + "\n";

    if (this._options.overwriteImport == undefined) {
      result += importStrings + "\n";
    } else {
      result += Utils.extractData(this._options.overwriteImport, context) + "\n";
    }

    if (this._options.inject) {
      result += Utils.extractData(this._options.inject, context) + "\n";
    }

    if (this._options.overwriteExport == undefined) {
      result += exportStrings;
    } else {
      result += Utils.extractData(this._options.overwriteExport, context);
    }

    this._throttle[filepath] = setTimeout(() => {
      if (this._writeable.check(result.toString(), filepath)) {
        fs.writeFileSync(filepath, result.toString());
      }

      delete this._throttle[filepath];

      if (Object.keys(this._throttle).length == 0) {
        this._events.emit("done");
      }
    }, 10);
  }

}

function index (options) {
  let opts = new Options(options);
  let exporter = new Exporter(opts);
  exporter.addDirectorys(this.directory);
  exporter.addDirectorys(this.filtered && this.filtered.length ? this.filtered : this.files);
  exporter.addEventListener("done", () => {
    this.events.dispatch("default");
  });
  return exporter;
}

export default index;
