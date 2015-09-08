var crypto = require('crypto'),
	fs = require('fs'),
	gutil = require('gulp-util'),
	through2 = require('through2'),
	path = require('path'),
	extend = require('lodash.assign'),
	template = require('lodash.template'),
	Stream = require('stream'),
	Promise = require('es6-promise').Promise;

var defaultOptions = {
	algorithm: 'sha1', // Either a hash type string for crypto.createHash or a custom hashing function
	hashLength: 8, // Length of the outputted hash
	template: '<%= name %>-<%= hash %><%= ext %>',
	version: '' // Version of asstes to use in hash function (appended to the contents)
};

// Parses and separates the file name and extension from a filename/path
function parseFilename(filename) {
	var ext = path.extname(filename),
		name = path.basename(filename, ext);

	return {
		name: name,
		ext: ext
	};
}

// Normalizes/formats a path for the manifest file
function formatManifestPath(mPath) {
	return path.normalize(mPath).replace(/\\/g, '/');
}

function getHash(file, algorithm, version) {
	return new Promise(function(resolve, reject) {
		var stream;

		if (typeof algorithm === 'function') {
			// Support custom hash functions
			var contents = '';

			stream = through2(function(data, enc, cb) {
				contents += (data !== null ? data.toString() : '');
				cb();
			}, function() {
				resolve(algorithm(contents + version.toString()));
			});

			file.pipe(stream, {end: true});
		} else {
			// As well as the default ones
			stream = crypto.createHash(algorithm);
			stream.setEncoding('hex');

			stream.on('readable', function() {
				var hash = stream.read();
				if (hash) resolve(hash);
			});

			var fullContents = '';
			file.pipe(through2.obj(function(contents, enc, cb) {
				if (contents !== null) fullContents += contents.toString();
				cb();
			}, function() {
				stream.write(fullContents + version.toString());
				stream.end();
			}));
		}
	});
}

var exportObj = function(userOptions) {
	if (typeof userOptions === 'undefined') userOptions = {};
	var options = extend({}, defaultOptions, userOptions);

	return through2.obj(function(file, enc, cb) {
		if (file.isDirectory()) { this.push(file); cb(); return; }

		// Because we need the full contents to hash them, we need to read
		// streamed contents into a buffer and later restream that
		if (file.isStream()) {
			var originalContent = new Buffer(file.stat.size), pos = 0;

			var originalContentDone = new Promise(function(resolve, reject) {
				file.contents.pipe(through2(function(content, enc, cb) {
					content.copy(originalContent, pos);
					pos += content.length;
					cb();
				}, function() {
					resolve();
				}));
			});
		}

		getHash(file, options.algorithm, options.version).then(function(hash) {
			hash = hash.substr(0, options.hashLength);

			var fileInfo = parseFilename(file.relative);

			file.hash = hash;
			file.origFilename = path.basename(file.relative);

			var newFilename = template(options.template, {
				hash: hash,
				name: fileInfo.name,
				ext: fileInfo.ext
			});

			file.path = path.join(path.dirname(file.path), newFilename);

			if (file.isStream()) {
				// Restream the contents once we're done reading it
				originalContentDone.then(function() {
					file.contents = through2();
					file.contents.write(originalContent);

					this.push(file);
					cb();
				}.bind(this));
			} else {
				this.push(file);
				cb();
			}
		}.bind(this));
	});
};

var origManifestContents = {};
var appendQueue = Promise.resolve();

exportObj.manifest = function(manifestPath, append) {
	append = (typeof append === 'undefined' ? false : append);
	var manifest = {};

    if (append && ! origManifestContents[manifestPath]) {
        try {
            var content = fs.readFileSync(manifestPath, {encoding: 'utf8'});
            origManifestContents[manifestPath] = JSON.parse(content);
        } catch (e) {
            origManifestContents[manifestPath] = {};
        }
    }

	return through2.obj(
		function(file, enc, cb) {
			if (typeof file.origFilename !== 'undefined') {
				var manifestSrc = formatManifestPath(path.join(path.dirname(file.relative), file.origFilename));
				var manifestDest = formatManifestPath(file.relative);
				manifest[manifestSrc] = manifestDest;
			}

			cb();
		},

		function(cb) {
			var contents = {},
			    finish;

			finish = function(data) {
                origManifestContents[manifestPath] = data;

				this.push(new gutil.File({
					path: manifestPath,
					contents: new Buffer(JSON.stringify(origManifestContents[manifestPath]))
				}));

				cb();
			}.bind(this);

			if (append) {
                appendQueue.then(new Promise(function(resolve, reject) {
                    finish(extend({}, origManifestContents[manifestPath], manifest));
                    resolve();
                }));
			} else {
				finish(manifest);
			}
		}
	);
};

module.exports = exportObj;
