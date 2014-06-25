var path = require('path'),
	gutil = require('gulp-util'),
	assert = require('assert'),
	hash = require('../index.js');

var fakeFile = new gutil.File({
	contents: new Buffer('Hello'),
	path: 'file.txt'
});

it('should work with crypto hash types', function(done) {
	var testHash = hash({
		algorithm: 'sha1',
		length: 8
	});

	testHash.once('data', function(file) {
		assert.equal(path.basename(file.path), 'file-f7ff9e8b.txt');
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