var path = require('path'),
    gulp = require('gulp'),
		Vinyl = require('vinyl'),
	through2 = require('through2'),
	assert = require('assert'),
	hash = require('../index.js'),
	fs = require('fs');

describe('hash.manifest()', function() {
	it('should generate valid manifest file', function(done) {
		hash.resetManifestCache();

		gulp.src(__dirname + '/fixture.txt')
			.pipe(hash({
				algorithm: 'sha1',
				hashLength: 8
			}))
			.pipe(hash.manifest(''))
			.pipe(through2.obj(function(file) {
				assert.equal(file.contents.toString(), JSON.stringify({
					"fixture.txt": "fixture-1d229271.txt"
				}));
				done();
			}));
	});

	it('should support changing output paths', function(done) {
		hash.resetManifestCache();

		gulp.src(__dirname + '/fixture.txt')
			.pipe(hash({
				algorithm: 'sha1',
				hashLength: 8,
				template: 'out/<%= name %>-<%= hash %><%= ext %>'
			}))
			.pipe(hash.manifest(''))
			.pipe(through2.obj(function(file) {
				var err = null;
				try {
					assert.equal(file.contents.toString(), JSON.stringify({
						"fixture.txt": "out/fixture-1d229271.txt"
					}));
				} catch(e) { err = e; }
				done(err);
			}));
	});

	it('the append option should work and use a queue', function(done) {
		hash.resetManifestCache();

		var fakeFile = new Vinyl({
			contents: Buffer.from('Hello'),
			path: 'file-f7ff9e8b.txt'
		});

		fakeFile.origPath = 'file.txt';

		var fakeFile2 = new Vinyl({
			contents: Buffer.from('Hello'),
			path: 'foo-123.txt'
		});

		fakeFile2.origPath = 'foo.txt';

		var fakeFile3 = new Vinyl({
			contents: Buffer.from('Hello'),
			path: 'foo-456.txt'
		});

		fakeFile3.origPath = 'foo.txt';

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
				// The order here is important, foo.txt should have foo-456 as its value
				assert.equal(file.contents.toString(), '{"file.txt":"file-f7ff9e8b.txt","foo.txt":"foo-456.txt"}');
			} catch (e) { err = e; }

			done(err);
		});

		stream3.write(fakeFile3);
		stream3.end();
	});

	describe('deleteOld', function() {
		it('should delete files that have a different hash', function(done) {
			hash.resetManifestCache();

			var tempDir = path.join(__dirname, 'temp');
			var testFile1 = path.join(tempDir, 'test-file-1.dat');
			var testFile2 = path.join(tempDir, 'test-file-2.dat');

			var testFile1HashedOrig = path.join(tempDir, 'test-file-1-f8e79b07.dat');
			var testFile1HashedNew = path.join(tempDir, 'test-file-1-3e56ecec.dat');
			var testFile2HashedOrig = path.join(tempDir, 'test-file-2-09df3c37.dat');

			fs.writeFileSync(testFile1, 'dummy contents');
			fs.writeFileSync(testFile2, 'dummy contents 2');

			function cleanup() {
				fs.existsSync(testFile1) && fs.unlinkSync(testFile1);
				fs.existsSync(testFile2) && fs.unlinkSync(testFile2);
				fs.existsSync(testFile1HashedOrig) && fs.unlinkSync(testFile1HashedOrig);
				fs.existsSync(testFile1HashedNew) && fs.unlinkSync(testFile1HashedNew);
				fs.existsSync(testFile2HashedOrig) && fs.unlinkSync(testFile2HashedOrig);
			}

			gulp.src([testFile1, testFile2])
				.pipe(hash())
				.pipe(gulp.dest(tempDir))
				.pipe(hash.manifest('a'))

				.pipe(through2.obj(function() {
					fs.writeFileSync(testFile1, 'dummy contents changed');

					gulp.src(testFile1)
						.pipe(hash())
						.pipe(gulp.dest(tempDir))
						.pipe(hash.manifest('a', {
							append: true,
							deleteOld: true,
							sourceDir: tempDir
						}))
						.pipe(through2.obj(function() {
							var err = null;

							try {
								assert.equal(fs.existsSync(testFile1HashedOrig), false, 'Original hashed file 1 is removed');
								assert.equal(fs.existsSync(testFile1HashedNew), true, 'New hashed file 1 exists');
								assert.equal(fs.existsSync(testFile2HashedOrig), true, 'Original hashed file 2 exists');
							} catch (e) { err = e; }

							cleanup();
							done(err);
						}));
				}));
		});

		it('should delete files that are missing from the new manifest', function(done) {
			hash.resetManifestCache();

			var tempDir = path.join(__dirname, 'temp');
			var testFile1 = path.join(tempDir, 'test-file-a.dat');
			var testFile2 = path.join(tempDir, 'test-file-b.dat');

			var testFile1Hashed = path.join(tempDir, 'test-file-a-f8e79b07.dat');
			var testFile2Hashed = path.join(tempDir, 'test-file-b-09df3c37.dat');

			fs.writeFileSync(testFile1, 'dummy contents');
			fs.writeFileSync(testFile2, 'dummy contents 2');

			function cleanup() {
				fs.existsSync(testFile1) && fs.unlinkSync(testFile1);
				fs.existsSync(testFile2) && fs.unlinkSync(testFile2);
				fs.existsSync(testFile1Hashed) && fs.unlinkSync(testFile1Hashed);
				fs.existsSync(testFile2Hashed) && fs.unlinkSync(testFile2Hashed);
			}

			hash.resetManifestCache();

			// Start by hashing them both
			gulp.src([testFile1, testFile2])
				.pipe(hash())
				.pipe(gulp.dest(tempDir))
				.pipe(hash.manifest('a'))

				.pipe(through2.obj(function() {
					gulp.src(testFile1)
						.pipe(hash())
						.pipe(gulp.dest(tempDir))
						.pipe(hash.manifest('a', {
							append: false,
							deleteOld: true,
							sourceDir: tempDir
						}))
						.pipe(through2.obj(function() {
							var err = null;

							try {
								assert.equal(fs.existsSync(testFile1Hashed), true, 'Hashed file 1 exists');
								assert.equal(fs.existsSync(testFile2Hashed), false, 'Hashed file 2 was missing from manifest and removed');
							} catch (e) { err = e; }

							cleanup();
							done(err);
						}));
				}));
		});
	});
});
