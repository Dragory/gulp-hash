var path = require('path'),
	gutil = require('gulp-util'),
	assert = require('assert'),
	hash = require('../index.js');

it('should generate valid manifest file', function(done) {
	var fakeFile = new gutil.File({
		contents: new Buffer('Hello'),
		path: 'file-f7ff9e8b.txt'
	});

	fakeFile.origFilename = 'file.txt';

	var manifestStream = hash.manifest('');

	manifestStream.once('data', function(file) {
		assert.equal(file.contents.toString(), '{"file.txt":"file-f7ff9e8b.txt"}');
		done();
	});

	manifestStream.write(fakeFile);
	manifestStream.end();
});