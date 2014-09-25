var gulp = require('gulp'),
    es = require('event-stream'),
    runSeq = require('run-sequence'),
    hash = require('gulp-hash'),
    extend = require('gulp-extend'); // See https://github.com/adamayres/gulp-extend

var hashOptions = {
	algorithm: 'md5',
	hashLength: 10,
	template: '<%= name %>.<%= hash %><%= ext %>'
};

var manifestPath = 'asset-hashes.json';

// Adds the files in `srcStream` to the manifest file, extending the manifest's current contents.
function addToManifest(srcStream) {
	return es.concat(
		gulp.src(manifestPath),
		srcStream
			.pipe(hash.manifest(manifestPath))
	)
	.pipe(extend(manifestPath, false, 4))
	.pipe(gulp.dest('.'));
}

gulp.task('scripts', function() {
	return addToManifest(
		gulp.src('js/**/*', {base: 'js'})
			.pipe(hash(hashOptions))
			.pipe(gulp.dest('public/js'))
	);
});

gulp.task('styles', function() {
	return addToManifest(
		gulp.src('css/**/*', {base: 'css'})
			.pipe(hash(hashOptions))
			.pipe(gulp.dest('public/css'))
	);
});

gulp.task('default', function(cb) {
	runSeq('scripts', 'styles', cb);
});