var crypto = require('crypto'),
	es = require('event-stream'),
	path = require('path'),
	fs = require('fs'),
	Stream = require('stream');

var defaultOptions = {
	algorithm: 'sha1', // Either a hash type string for crypto.createHash or a custom hashing function
	hashLength: 8, // Length of the outputted hash

	renameFiles: true, // Whether to add the hash to the files' names
	renameFunc: defaultRename, // See defaultRename below for more info

	editFiles: false, // Whether to add the hash to the files' contents
	editFunc: defaultEdit, // See defaultEdit below for more info

	generateMappings: true, // Whether to output the mappings to a file or a function or not
	mappingTarget: 'asset-hashes.json', // A file path or a function
	mergeMappings: true,   // If true and mappingTarget is a path, merges the new mappings with the old ones from mappingFile.
	mappingBasePath: '',   // Path to remove from the beginning of the file paths in the mapping file
	mappingPathPrefix: '', // Path to append to the beginning of the file paths in the mapping file
	formatMappings: null   // Function to manipulate the mappings object before passing it to mappingTarget
};

/**
 * A simple rename that joins the file's name, hash and extension by a dot.
 * Results are similar to: scripts.ab32c4.js
 *
 * @param  {string}  name  The file's name without the extension
 * @param  {string}  hash  The generated hash of the file contents
 * @param  {string}  ext   The file's extension without a leading dot
 *
 * @return  {string}  The resulting filename
 */
function defaultRename(name, hash, ext) {
	return [name, hash, ext].join('.');
}

/**
 * A simple edit that adds the file's hash as a comment to the top of the file
 *
 * @param  {object}  file      The original vinyl file object
 * @param  {string}  contents  The file's contents to process
 * @param  {string}  hash      The generated hash of the file contents
 *
 * @return  {string}  The processed file contents
 */
function defaultEdit(file, contents, hash) {
	return "// @hash " + hash + "\n" + contents;
}

// Utility function for shallow-merging objects
function mergeObjects() {
	var args = Array.prototype.slice.call(arguments),
		result = {},
		i, len;

	for (i = 0, len = args.length; i < len; i++) {
		for (var prop in args[i]) {
			if (! args[i].hasOwnProperty(prop)) continue;
			result[prop] = args[i][prop];
		}
	}

	return result;
}

// Parses and separates the file name and extension from a path
function parseFilePath(inputPath) {
	var ext = path.extname(inputPath),
		name = path.basename(inputPath, ext);

	return {
		name: name,
		ext: ext.substr(1)
	};
}

/**
 * The plugin's main object.
 * See defaultOptions above for a description of userOptions.
 */
function Hasher(userOptions) {
	this.options = {};
	this.mappings = {};

	if (typeof userOptions === 'undefined') userOptions = {};
	this.options = mergeObjects(defaultOptions, userOptions);
}

// Returns the hash of the file's contents
Hasher.prototype.getHash = function(file) {
	var _this = this,
		func, hash;

	if (typeof _this.options.algorithm === 'function') {
		// Support custom hash functions
		func = new Stream.Transform({objectMode: true});
		func._transform = function(data, encoding, callback) {
			this.push(_this.options.algorithm(data));
		};

		file.pipe(func);
		hash = func.read();
	} else {
		// As well as the default ones
		func = crypto.createHash(this.options.algorithm);

		file.pipe(func);
		hash = func.read().toString('hex');
	}

	return hash.substr(0, _this.options.hashLength);
};

// Applies mapping path options to the given path, normalizes it and converts slashes to forward-slashes
Hasher.prototype.formatMappingPath = function(mPath) {
	// Strip base path
	if (this.options.mappingBasePath !== '') {
		mPath = path.relative(this.options.mappingBasePath, mPath);
	}

	// Add path prefix
	if (this.options.mappingPathPrefix !== '') {
		mPath = path.join(this.options.mappingPathPrefix, mPath);
	}

	return path.normalize(mPath).replace(/\\/g, '/');
};

// Applies the specified rename and edit functions to the file
Hasher.prototype.processFile = function(file) {
	var _this = this,
		hash = this.getHash(file),
		mappingFrom = file.relative;

	if (this.options.renameFiles) {
		// Apply the specified rename function to the file's path
		var filePathInfo = parseFilePath(file.relative),
			renamedFilename = this.options.renameFunc(filePathInfo.name, hash, filePathInfo.ext);

		file.path = path.join(path.dirname(file.path), renamedFilename);
	}

	if (this.options.editFiles) {
		// Apply the specified edit function to the file's contents
		var rewriteStream = new Stream.Transform({objectMode: true});
		rewriteStream._transform = function(data, encoding, callback) {
			this.push(_this.options.editFunc(file, data, hash));
		};

		file.pipe(rewriteStream);

		if (file.isBuffer()) {
			file.contents = new Buffer(rewriteStream.read(), encoding);
		} else {
			file.contents = rewriteStream;
		}
	}

	this.addMapping(mappingFrom, file.relative);

	return file;
};

// Adds the given 'from' and 'to' to our mappings
Hasher.prototype.addMapping = function(from, to) {
	from = this.formatMappingPath(from);
	to = this.formatMappingPath(to);

	this.mappings[from] = to;
};

// Either writes the mappings to a file as JSON or passes them to a user-specified function
Hasher.prototype.outputMappings = function() {
	var _this = this,
		mappings = mergeObjects(this.mappings);

	if (! this.options.generateMappings) return;

	if (typeof this.options.formatMappings === 'function') {
		mappings = this.options.formatMappings(mappings);
	}

	if (typeof this.options.mappingTarget === 'string') {
		// Write directly to a file
		if (this.options.mergeMappings) {
			// Merge the old mappings with the new ones
			fs.readFile(this.options.mappingTarget, function(err, data) {
				var previousMappings = {};
				if (! err) previousMappings = JSON.parse(data);

				mappings = mergeObjects(previousMappings, mappings);
				fs.writeFile(_this.options.mappingTarget, JSON.stringify(mappings));
			});
		} else {
			// Overwrite the old mapping file with the new one
			fs.writeFile(this.options.mappingTarget, JSON.stringify(mappings));
		}
	} else {
		// Pass the mappings to the user-supplied function
		this.options.mappingTarget(mappings);
	}
};

module.exports = function(userOptions) {
	var hasher = new Hasher(userOptions);

	return es.map(function(file, callback) {
		callback(null, hasher.processFile(file));
	})
	.on('end', function() {
		hasher.outputMappings();
	});
};