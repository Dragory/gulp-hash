# gulp-hash [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url]
Cachebust your assets by adding a hash to the filename

`npm install --save-dev gulp-hash`

## Basic usage

```javascript
var hash = require('gulp-hash');

gulp.src('./js/**/*.js')
	.pipe(hash()) // Add hashes to the files' names
	.pipe(gulp.dest('public/js')) // Write the renamed files
	.pipe(hash.manifest('public/assets.json', { // Generate the manifest file
	  deleteOld: true,
	  sourceDir: __dirname + '/public/js'
	}))
	.pipe(gulp.dest('.')); // Write the manifest file (see note below)
```

The "manifest" is a JSON file that maps the original filenames to the renamed ones.

**Note:** It is recommended to use the full relative path to the manifest file in `hash.manifest()` as opposed to setting it in `gulp.dest()`. This is so the `append` option is able find the original manifest file. The example above demonstrates this.

## Streaming
The plugin fully supports both buffers and streams. If you encounter any problems, please open an issue on GitHub and I'll look into it!

## API
### hash(options)

| Option | Default | Description |
| ------ | ------- | ----------- |
| algorithm | 'sha1' | [A hashing algorithm for crypto.createHash](https://nodejs.org/api/crypto.html#crypto_crypto_createhash_algorithm) |
| hashLength | 8 | The length of the hash to add to the file's name (slice from the start of the full hash) |
| template | `'<%= name %>-<%= hash %><%= ext %>'` | The template used when adding the hash |
| version | '' | A key to change the files' hashes without actually changing their content; appended to the contents when hashing |

### hash.manifest(manifestPath, options)

| Parameter | Default | Description |
| --------- | ------- | ----------- |
| manifestPath | (none) | The desired path to the manifest file |
| options.append | true | Whether to merge the new manifest with an existing one's contents (same filename, doesn't have to exist before first run) |
| options.space | null | [The space parameter for JSON.stringify()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)|
| options.deleteOld | false | If set to `true`, deletes old versions of hashed files |
| options.sourceDir | __dirname | Used with `deleteOld`. Specifies where to search for old files to delete. |
| options.map | (none) | Function allowing to modify keys (source) and values (destination) before the creation of the manifest. Should return an array with the new key-value pair respectively in the first and second entry. |

### hash.manifest(manifestPath, append, space)

| Parameter | Default | Description |
| --------- | ------- | ----------- |
| manifestPath | (none) | The desired path to the manifest file |
| append | true | (optional) Whether to merge the new manifest with an existing one's contents (same filename, doesn't have to exist before first run) |
| space | undefined | (optional) [The space parameter for JSON.stringify()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)|

[npm-url]: https://www.npmjs.org/package/gulp-hash
[npm-image]: https://badge.fury.io/js/gulp-hash.svg

[travis-url]: https://travis-ci.org/Dragory/gulp-hash
[travis-image]: https://api.travis-ci.org/Dragory/gulp-hash.svg
