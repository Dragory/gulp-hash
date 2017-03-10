var crypto = require('crypto'),
    through2 = require('through2'),
    gutil = require('gulp-util'),
    assign = require('lodash.assign'),
    template = require('lodash.template'),
    path = require('path'),
    Promise = require('es6-promise').Promise,
    fs = require('fs');

var exportObj = function(options) {
  options = assign({}, {
    algorithm: 'sha1',
    hashLength: 8,
    template: '<%= name %>-<%= hash %><%= ext %>',
    version: ''
  }, options);

  return through2.obj(function(file, enc, cb) {
    if (file.isDirectory()) {
      this.push(file);
      cb();
      return;
    }

    var fileExt = path.extname(file.relative),
        fileName = path.basename(file.relative, fileExt);

    var hasher = crypto.createHash(options.algorithm);

    var piped = file.pipe(through2(
      function(chunk, enc, updateCb) {
        hasher.update(chunk);
        updateCb(null, chunk);
      },

      function(flushCb) {
        if (options.version !== '') hasher.update(String(options.version));
        file.hash = hasher.digest('hex').slice(0, options.hashLength);

        file.origPath = file.relative;
        file.path = path.join(path.dirname(file.path), template(options.template, {
          hash: file.hash,
          name: fileName,
          ext: fileExt
        }));

        this.push(file);
        cb();
        flushCb();
      }.bind(this)
    ));

    if (file.isStream()) {
      var newContents = through2();
      piped.pipe(newContents);
      file.contents = newContents;
    }
  });
};

var origManifestContents = {};
var appendQueue = Promise.resolve();

// Normalizes a path for the manifest file (i.e. backslashes -> slashes)
function formatManifestPath(mPath) {
  return path.normalize(mPath).replace(/\\/g, '/');
}

exportObj.manifest = function(manifestPath, options) {
  var space;
  var append;
  var sourceDir;
  var deleteOld = false;

  if (arguments.length === 2 && typeof options === 'object') {
    append = options.append;
    space = options.space;
    sourceDir = options.sourceDir;
    deleteOld = !!options.deleteOld;
  }

  append = (typeof append === 'undefined' ? true : !!append);

  var manifest = {};

  if (append && ! origManifestContents[manifestPath]) {
    try {
      var content = fs.readFileSync(manifestPath, {encoding: 'utf8'});
      origManifestContents[manifestPath] = JSON.parse(content);
    } catch (e) {
      origManifestContents[manifestPath] = {};
    }
  }

  function deleteOldFiles(oldFiles, newFiles, dirPath) {
    for (var prop in oldFiles) {
      if (newFiles.hasOwnProperty(prop) === false || oldFiles[prop] !== newFiles[prop]) {
        try {
          fs.unlinkSync(dirPath + '/' + oldFiles[prop]);
        } catch (e) {
          console.warn(e.message);
        }
      }
    }
  }

  return through2.obj(
    function(file, enc, cb) {
      if (typeof file.origPath !== 'undefined') {
        var manifestSrc = formatManifestPath(file.origPath);
        var manifestDest = formatManifestPath(file.relative);
        manifest[manifestSrc] = manifestDest;
      }

      cb();
    },

    function(cb) {
      var finish = function(data) {
        if (deleteOld) {
          deleteOldFiles(origManifestContents[manifestPath], data, sourceDir);
        }

        origManifestContents[manifestPath] = data;

        this.push(new gutil.File({
          path: manifestPath,
          contents: new Buffer(JSON.stringify(origManifestContents[manifestPath], undefined, space))
        }));

        cb();
      }.bind(this);

      if (append) {
        appendQueue.then(new Promise(function(resolve) {
          finish(assign({}, origManifestContents[manifestPath], manifest));
          resolve();
        }));
      } else {
        finish(manifest);
      }
    }
  );
};

module.exports = exportObj;
