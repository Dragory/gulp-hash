var path = require('path'),
	gutil = require('gulp-util'),
	assert = require('assert'),
	hash = require('../index.js');

var fakeFile = new gutil.File({
	contents: new Buffer('Hello'),
	path: 'file.txt'
});

var fakeDir = new gutil.File({
	contents: null,
	path: 'dir',
	stat: {
    isDirectory: function() {
      return true;
    }
  }
});

it('should work with crypto hash types', function(done) {
	var testHash = hash({
		algorithm: 'sha1',
		length: 8
	});

	testHash.once('data', function(file) {
		assert.equal(path.basename(file.path), 'file-6f4c6482.txt');
		done();
	});

	testHash.write(fakeFile.clone());
	testHash.end();
});

it('should work with custom hash functions', function(done) {
	var testHash = hash({
		algorithm: function(data) {
			return '0123456789';
		},
		length: 8
	});

	testHash.once('data', function(file) {
		assert.equal(path.basename(file.path), 'file-01234567.txt');
		done();
	});

	testHash.write(fakeFile.clone());
	testHash.end();
});

it('should skip directories', function(done) {
	var testHash = hash({
		algorithm: 'sha1',
		length: 8
	});

	testHash.once('data', function(file) {
		assert.equal(file.path, 'dir');
		done();
	});

	testHash.write(fakeDir.clone());
	testHash.end();
});

it('should use assets version', function(done) {
	var one = hash({
		length: 8,
		version: 0
	});
	var two = hash({
		length: 8,
		version: 1
	});

	one.once('data', function(file1) {
		two.once('data', function(file2) {
			assert.notEqual(path.basename(file1.path), path.basename(file2.path));
			done();
		});
	});

	one.write(fakeFile.clone());
	one.end();
	two.write(fakeFile.clone());
	two.end();
});
