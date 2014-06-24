var path = require('path'),
	File = require('vinyl'),
	es = require('event-stream'),
	assert = require('assert'),
	hasher = require('../index.js');

describe('sha1', function() {
	var fakeFile = new File({
		contents: new Buffer('Hello'),
		path: 'file.txt'
	}),
	testHasher = hasher({
		algorithm: 'sha1',
		length: '8'
	});

	testHasher.write(fakeFile);

	it('should have correct filename', function(done) {
		testHasher.once('data', function(file) {
			assert.equal(path.basename(file.path), 'file.f7ff9e8b.txt');
			done();
		});
	});
});

describe('md5', function() {
	var fakeFile = new File({
		contents: new Buffer('Hello'),
		path: 'file.txt'
	}),
	testHasher = hasher({
		algorithm: 'md5',
		length: '8'
	});

	testHasher.write(fakeFile);

	it('should have correct filename', function(done) {
		testHasher.once('data', function(file) {
			assert.equal(path.basename(file.path), 'file.8b1a9953.txt');
			done();
		});
	});
});