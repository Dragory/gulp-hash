# gulp-hash
Gulp plugin for cachebusting files by adding a hash to their name and/or content.
Optionally writes a JSON file with mappings from the original filename to the renamed one.

## Basic usage

```javascript
var hash = require('gulp-hash');

// ...

gulp.src('./js/**/*')
	.pipe(hash()) // Add hashes to the files' names
	.pipe(gulp.dest('public/js')) // Write the now-renamed files
	.pipe(hash.manifest('asset-hashes.json')) // Change the stream to the manifest file
	.pipe(gulp.dest('public')); // Write the manifest file
```

## API
### hash(options)

| Option | Default | Description |
| ------ | ------- | ----------- |
| algorithm | 'sha1' | A hashing algorithm for crypto.createHash or equivalent custom function |
| hashLength | 8 | The length of the hash to add to the file's name (substr from the start of the full hash) |
| template | `'<%= name %>-<%= hash %><%= ext %>'` | Format for renaming the files |

## A more advanced example
See [example/example-gulpfile.js](example/example-gulpfile.js) for an example for a full gulpfile.