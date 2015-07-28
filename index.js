var crypto = require('crypto'),
    fs = require('fs'),
	gutil = require('gulp-util'),
	es = require('event-stream'),
	path = require('path'),
	extend = require('lodash.assign'),
	template = require('lodash.template'),
	Stream = require('stream'),
	Promise = require('es6-promise').Promise;

var defaultOptions = {
	algorithm: 'sha1', // Either a hash type string for crypto.createHash or a custom hashing function
	hashLength: 8, // Length of the outputted hash

	template: '<%= name %>-<%= hash %><%= ext %>'
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

function getHash(file, algorithm) {
	return new Promise(function(resolve, reject) {
		var stream;

		if (typeof algorithm === 'function') {
			// Support custom hash functions
			var contents = '';

			stream = es.through(function(data) {
				contents += (data !== null ? data.toString() : '');
			}, function() {
				resolve(algorithm(contents));
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

			file.pipe(es.through(function(contents) {
				stream.write(contents.toString());
			}, function() {
				stream.end();
			}), {end: true});
		}
	});
}

var exportObj = function(userOptions) {
	if (typeof userOptions === 'undefined') userOptions = {};
	var options = extend({}, defaultOptions, userOptions);

	return es.map(function(file, callback) {
		// Skip file if file is a directory
		if (file.isDirectory()) { return callback(null, file); }

		getHash(file, options.algorithm).then(function(hash) {
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

			callback(null, file);
		});
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

	return es.through(
		function(file, callback) {
			if (typeof file.origFilename !== 'undefined') {
				var manifestSrc = formatManifestPath(path.join(path.dirname(file.relative), file.origFilename));
				var manifestDest = formatManifestPath(file.relative);
				manifest[manifestSrc] = manifestDest;
			}
		},

		function() {
			var contents = {},
			    finish;

			finish = function(data) {
                origManifestContents[manifestPath] = data;

				this.queue(new gutil.File({
					path: manifestPath,
					contents: new Buffer(JSON.stringify(origManifestContents[manifestPath]))
				}));

				this.queue(null);
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
