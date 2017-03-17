# Changelog

## 4.1.0
Thanks to PR #18 from @MEGApixel23:
* New signature for hash.manifest: `hash.manifest(manifestPath, options)`
  * Old signature `hash.manifest(manifestPath, append, space)` is still supported
* New options for `hash.manifest`:
  * `deleteOld` Deletes old hashed files mentioned in the manifest. This includes both files with different hashes and files that have been removed from the manifest.
  * `sourceDir` Used with `deleteOld`. Specifies the directory where to delete old hashed files from.

## 4.0.1
* Update contributor and changelog info for npm

## 4.0.0
* Original path ("left side") in the manifest file now uses the file's original path instead of target path + filename. #17
  * This allows you to change the path with e.g. gulp-rename both before calling `hash()` and after
  * **May break some setups**, hence major version bump
  * Thanks to https://github.com/jorrit!

## 3.0.2
* The `version` option now handles non-strings correctly (thanks @outpunk, https://github.com/Dragory/gulp-hash/pull/9)

## 3.0.0
This is a **major** release and includes breaking changes.

* Proper support for streams
* Deprecated custom hashing functions
* Manifest option `append` is now `true` by default
* Removed examples until they are updated
