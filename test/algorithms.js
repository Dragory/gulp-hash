var path = require('path'),
    fs = require('fs'),
    gulp = require('gulp'),
	assert = require('assert'),
	through2 = require('through2'),
	hash = require('../index.js');

describe('hash()', function() {
	it('should change the hash using given version (string)', function(done) {
		gulp.src(__dirname + '/fixture.txt')
			.pipe(hash({
				algorithm: 'sha1',
				hashLength: 8,
        version: '1',
			}))
			.pipe(through2.obj(function(file) {
				assert.equal(path.basename(file.path), 'fixture-1914dcfd.txt');
				done();
			}));
	});

  it('should change the hash using given version (integer)', function(done) {
    gulp.src(__dirname + '/fixture.txt')
      .pipe(hash({
        algorithm: 'sha1',
        hashLength: 8,
        version: 1,
      }))
      .pipe(through2.obj(function(file) {
        assert.equal(path.basename(file.path), 'fixture-1914dcfd.txt');
        done();
      }));
  });

	it('should append the hash to files with stream content', function(done) {
		gulp.src(__dirname + '/fixture.txt', {buffer: false})
			.pipe(hash({
				algorithm: 'sha1',
				hashLength: 8
			}))
			.pipe(through2.obj(function(file) {
				assert.equal(path.basename(file.path), 'fixture-1d229271.txt');
				done();
			}));
	});

  it('should append the hash to files with buffer content', function(done) {
    gulp.src(__dirname + '/fixture.txt', {buffer: true})
      .pipe(hash({
        algorithm: 'sha1',
        hashLength: 8
      }))
      .pipe(through2.obj(function(file) {
        assert.equal(path.basename(file.path), 'fixture-1d229271.txt');
        done();
      }));
  });

	it('should retain buffer file content', function(done) {
		fs.readFile(__dirname + '/fixture.txt', {encoding: 'utf8'}, function(err, ref) {
			gulp.src(__dirname + '/fixture.txt', {buffer: true})
				.pipe(hash({
					algorithm: 'sha1',
					hashLength: 8
				}))
				.pipe(through2.obj(function(file) {
					file.pipe(through2.obj(function(content) {
						assert.equal(content.toString(), ref);
						done();
					}));
				}));
		});
	});

	it('should retain stream file content', function(done) {
		fs.readFile(__dirname + '/fixture.txt', {encoding: 'utf8'}, function(err, ref) {
			gulp.src(__dirname + '/fixture.txt', {buffer: false})
				.pipe(hash({
					algorithm: 'sha1',
					hashLength: 8
				}))
				.pipe(through2.obj(function(file) {
					var content = "";
					file.pipe(through2(
						function(chunk, enc, cb) {
							content += chunk.toString();
							cb();
						},
						function() {
							assert.equal(content, ref);
							done();
						}
					));
				}));
		});
	});

	it('should skip directories', function(done) {
		gulp.src(__dirname + '/fixture-dir')
			.pipe(hash({
				algorithm: 'sha1',
				length: 8
			}))
			.pipe(through2.obj(function(file) {
				// This indicates the path was not touched i.e. it ignored the dir
				assert.equal(path.basename(file.path), 'fixture-dir');
				done();
			}));
	});

	it('should support crypto algorithms', function(done) {
		gulp.src(__dirname + '/fixture.txt')
			.pipe(hash({
				algorithm: 'md5',
				length: 8
			}))
			.pipe(through2.obj(function(file) {
				assert.equal(path.basename(file.path), 'fixture-09f7e02f.txt');
				done();
			}));
	});
});
