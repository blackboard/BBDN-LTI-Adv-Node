const gulp = require('gulp');
const rename = require('gulp-rename');
const yaml = require('gulp-yaml');
const merge = require('merge2');
const mergeJson = require('gulp-merge-json');
const through = require('through2');

const config = {
    assetFiles: ['src/**/*.*', '!src/**/*.jsx', '!src/**/*.js'],
    sourceFiles: ['src/**/*.jsx', 'src/**/*.js', '!src/**/__tests__/**/*', '!src/**/__mocks__/**/*'],
    watchFiles: ['src/**/*.*'],
    cleanFiles: ['lib/'],
    outputFolder: 'lib/',
};

function groupAndMerge(stream, getGroup, destination) {
    const chunks = {};

    const getChunk = (group) => {
        if (chunks[group] == null) {
            chunks[group] = through.obj();

            chunks[group]
                .pipe(mergeJson({
                    exportModule: false,
                }))
                .pipe(rename((data) => {
                    data.basename = `${group}-combined`; // eslint-disable-line no-param-reassign
                }))
                .pipe(gulp.dest(destination));
        }

        return chunks[group];
    };

    return stream
        .pipe(through.obj((chunk, enc, cb) => {
            getChunk(getGroup(chunk)).write(chunk, enc, cb);
        }))
        .on('finish', () => {
            Object.keys(chunks).forEach((key) => {
                chunks[key].end();
            });
        });
}

gulp.task('locales', () => {
    const compileYaml = gulp.src('./locales/**/*.yaml')
        .pipe(yaml({
            schema: 'DEFAULT_SAFE_SCHEMA',
            safe: true,
        }));

    groupAndMerge(
        merge(compileYaml, gulp.src([
            './node_modules/bb-babelfish-format/locales/**/*.json',
        ])),
        chunk => (/\/locales\/([^/]+)\//.exec(chunk.path))[1],
        './locales.build/'
    );
});

gulp.task('cldrdata', () => {
    groupAndMerge(
        gulp.src([
            './node_modules/cldrdata/main/**/ca-gregorian.json',
            './node_modules/cldrdata/main/**/numbers.json',
            './node_modules/cldrdata/main/**/dateFields.json',
            './node_modules/cldrdata/main/**/units.json',
            './node_modules/cldrdata/main/**/listPatterns.json',
            './node_modules/cldrdata/main/**/currencies.json',
            './node_modules/cldrdata/main/**/timeZoneNames.json',
        ]),
        chunk => /\/main\/([^/]+)\//.exec(chunk.path)[1],
        './cldrdata.build/'
    );
});

gulp.task('i18n', ['locales', 'cldrdata']);
