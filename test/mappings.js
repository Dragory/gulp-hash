var path = require('path'),
	File = require('vinyl'),
	es = require('event-stream'),
	assert = require('assert'),
	hasher = require('../index.js'),
	Promise = require('bluebird');

describe('basic mapping generation', function() {
	var mappingPromise = new Promise(function(resolve, reject) {
		var fakeFile = new File({
			contents: new Buffer('Hello'),
			path: 'file.txt'
		});

		var testHasher = hasher({
			algorithm: 'sha1',
			length: '8',
			generateMappings: true,
			mappingTarget: function(mappings) {
				resolve(mappings);
			}
		});

		testHasher.write(fakeFile);
		testHasher.end();
	});

	it('should write the mapping correctly', function(done) {
		mappingPromise.then(function(mappings) {
			assert(typeof mappings['file.txt'] !== undefined);
			assert.equal(mappings['file.txt'], 'file.f7ff9e8b.txt');
			done();
		});
	});
});

describe('basepath and pathprefix', function() {
	mappingPromise = new Promise(function(resolve, reject) {
		var fakeFile = new File({
			contents: new Buffer('Hello'),
			path: 'long/nested/path/to/file.txt'
		});

		var testHasher = hasher({
			algorithm: 'sha1',
			length: '8',
			generateMappings: true,
			mappingBasePath: 'long/nested/path',
			mappingPathPrefix: 'shorter/path',
			mappingTarget: function(mappings) {
				console.log(mappings);
				resolve(mappings);
			}
		});

		testHasher.write(fakeFile);
		testHasher.end();
	});

	it('should remove basepath and apply pathprefix to both the key and the value', function(done) {
		mappingPromise.then(function(mappings) {
			assert(typeof mappings['shorter/path/to/file.txt'] !== undefined);
			assert.equal(mappings['shorter/path/to/file.txt'], 'shorter/path/to/file.f7ff9e8b.txt');
			done();
		});
	});
});