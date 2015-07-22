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
		var err = null;

		try {
			assert.equal(file.contents.toString(), '{"file.txt":"file-f7ff9e8b.txt"}');
		} catch (e) { err = e; }

		done(err);
	});

	manifestStream.write(fakeFile);
	manifestStream.end();
});

it('the append option should work and use a queue', function(done) {
	var fakeFile = new gutil.File({
		contents: new Buffer('Hello'),
		path: 'file-f7ff9e8b.txt'
	});

	fakeFile.origFilename = 'file.txt';

	var fakeFile2 = new gutil.File({
		contents: new Buffer('Hello'),
		path: 'foo-123.txt'
	});

	fakeFile2.origFilename = 'foo.txt';

	var fakeFile3 = new gutil.File({
		contents: new Buffer('Hello'),
		path: 'foo-456.txt'
	});

	fakeFile3.origFilename = 'foo.txt';

	// First this sets manifest content to {"file.txt":"file-f7ff9e8b.txt"}
	var manifestStream = hash.manifest('a', true);

	manifestStream.write(fakeFile);
	manifestStream.end();

	// {"file.txt":"file-f7ff9e8b.txt","foo.txt":"foo-123.txt"}
	var stream2 = hash.manifest('a', true);
	stream2.write(fakeFile2);
	stream2.end();

	// {"file.txt":"file-f7ff9e8b.txt","foo.txt":"foo-456.txt"} (overwriting the previous foo)
	var stream3 = hash.manifest('a', true);

	stream3.once('data', function(file) {
		var err = null;

		try {
			assert.equal(file.contents.toString(), '{"file.txt":"file-f7ff9e8b.txt","foo.txt":"foo-456.txt"}');
		} catch (e) { err = e; }

		done(err);
	});

	stream3.once('data', function(file) {
		// The order here is important, foo.txt should have foo-456 as its value


	});

	stream3.write(fakeFile3);
	stream3.end();
});
