var path = require('path'),
    gulp = require('gulp'),
    gutil = require('gulp-util'),
	assert = require('assert'),
	through2 = require('through2'),
	hash = require('../index.js');

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

	gulp.src([__dirname + '/fixture.txt'], {buffer: true})
		.pipe(hash({
			algorithm: 'sha1',
			length: 8
		}))
		.pipe(through2.obj(function(file) {
			assert.equal(path.basename(file.path), 'fixture-1d229271.txt');
			done();
		}));
});

it('should work with custom hash functions', function(done) {
	gulp.src([__dirname + '/fixture.txt'], {buffer: true})
		.pipe(hash({
			algorithm: function(data) {
				return '0123456789';
			},
			length: 8
		}))
		.pipe(through2.obj(function(file) {
			assert.equal(path.basename(file.path), 'fixture-01234567.txt');
			done();
		}));
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

it('should use assets version', function(done) {
	var Promise = require('es6-promise').Promise;

	Promise.all([
		new Promise(function(resolve, reject) {
			gulp.src(__dirname + '/fixture.txt')
				.pipe(hash({
					length: 8,
					version: 0
				}))
				.pipe(through2.obj(function(file) {
					resolve(file.path);
				}));
		}),

		new Promise(function(resolve, reject) {
			gulp.src(__dirname + '/fixture.txt')
				.pipe(hash({
					length: 8,
					version: 1
				}))
				.pipe(through2.obj(function(file) {
					resolve(file.path);
				}));
		})
	]).then(function(paths) {
		assert.notEqual(paths[0], paths[1]);
		done();
	});
});

it('should work with streams', function(done) {
	gulp.src(__dirname + '/fixture.txt')
		.pipe(hash({
			algorithm: 'sha1',
			length: 8
		}))
		.pipe(through2.obj(function(file) {
			assert.equal(path.basename(file.path), 'fixture-1d229271.txt');
			file.pipe(through2.obj(function(content) {
				assert(content.toString().length !== 0);
				done();
			}));
		}));
});
