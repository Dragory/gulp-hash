var crypto = require('crypto'),
	gutil = require('gulp-util'),
	es = require('event-stream'),
	path = require('path'),
	extend = require('lodash.assign'),
	template = require('lodash.template'),
	Stream = require('stream');

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
	var stream, hash;

	if (typeof algorithm === 'function') {
		// Support custom hash functions
		stream = es.through(function(data) {
			hash = algorithm(data);
		});

		file.pipe(stream);
	} else {
		// As well as the default ones
		stream = crypto.createHash(algorithm);

		file.pipe(stream);
		hash = stream.read().toString('hex');
	}

	return hash;
}

var exportObj = function(userOptions) {
	if (typeof userOptions === 'undefined') userOptions = {};
	options = extend({}, defaultOptions, userOptions);

	return es.map(function(file, callback) {
		var hash = getHash(file, options.algorithm).substr(0, options.hashLength),
			fileInfo = parseFilename(file.relative);

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
};

exportObj.manifest = function(manifestPath) {
	var manifest = {};

	return es.through(
		function(file, callback) {
			if (typeof file.origFilename !== 'undefined') {
				var manifestSrc = formatManifestPath(path.join(path.dirname(file.relative), file.origFilename));
				var manifestDest = formatManifestPath(file.relative);
				manifest[manifestSrc] = manifestDest;
			}
		},

		function() {
			this.queue(new gutil.File({
				path: manifestPath,
				contents: new Buffer(JSON.stringify(manifest))
			}));
			this.queue(null);
		}
	);
};

module.exports = exportObj;