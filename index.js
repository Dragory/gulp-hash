var crypto = require('crypto'),
	through2 = require('through2'),
	path = require('path'),
	fs = require('fs'),
	Stream = require('stream');

var defaultOptions = {
	algorithm: 'sha1',
	hashLength: 8,

	renameFiles: true, // Whether to add the hash to the files' names
	renameFunc: defaultRename, // See defaultRename below for more info

	editFiles: false, // Whether to add the hash to the files' contents
	editFunc: defaultEdit, // See defaultEdit below for more info

	writeMappingFile: true,
	mappingFile: 'asset-hashes.json',
	mappingBasePath: '',   // Path to remove from the beginning of the file paths in the mapping file
	mappingPathPrefix: '', // Path to append to the beginning of the file paths in the mapping file
	formatMappings: null   // Function to manipulate the mapping object
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

// Returns the hash of the contents of the given file
function getHash(file, algorithm, hashLength) {
	var func, hash;

	if (typeof algorithm === 'function') {
		// Support custom hash functions
		func = new Stream.Transform({objectMode: true});
		func._transform = function(data, encoding, callback) {
			this.push(algorithm(data));
		};

		file.pipe(func);
		hash = func.read();
	} else {
		// As well as the default ones
		func = crypto.createHash(algorithm);

		file.pipe(func);
		hash = func.read().toString('hex');
	}

	return hash.substr(0, hashLength);
}

function processFiles(userOptions) {
	var options = {},
		mappings = {};

	if (typeof userOptions === 'undefined') userOptions = {};
	options = mergeObjects(defaultOptions, userOptions);

	var formatMappingPath = function(mPath) {
		// Strip base path
		if (options.mappingBasePath !== '') {
			mPath = path.relative(options.mappingBasePath, mPath);
		}

		// Add path prefix
		mPath = path.join(options.mappingPathPrefix, mPath);

		return mPath;
	};

	var addMapping = function(from, to) {
		from = formatMappingPath(from);
		to = formatMappingPath(to);

		mappings[from] = to;
	};

	return through2.obj(function(file, encoding, callback) {
		var hash = getHash(file, options.algorithm, options.hashLength),
			originalPath = file.path,
			mappingFrom = file.relative;

		if (file.isNull()) return;

		if (options.renameFiles) {
			var filePathInfo = parseFilePath(file.relative),
				renamedFilename = options.renameFunc(filePathInfo.name, hash, filePathInfo.ext);

			file.path = path.join(path.dirname(file.path), renamedFilename);
		}

		if (options.editFiles) {
			var rewriteStream = new Stream.Transform({objectMode: true});
			rewriteStream._transform = function(data, encoding, callback) {
				this.push(options.editFunc(file, data, hash));
			};

			file.pipe(rewriteStream);

			if (file.isBuffer()) {
				file.contents = new Buffer(rewriteStream.read(), encoding);
			} else {
				file.contents = rewriteStream;
			}
		}

		addMapping(mappingFrom, file.relative);

		this.push(file);
		return callback();
	})
	.on('end', function() {
		if (! options.writeMappingFile) return;

		if (typeof options.formatMappings === 'function') {
			mappings = options.formatMappings(mappings);
		}

		fs.writeFile(options.mappingFile, JSON.stringify(mappings));
	});
}

module.exports = processFiles;