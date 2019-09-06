import * as fse from 'fs-extra';
import * as glob from 'glob';
import { describe, it } from 'mocha';
import * as path from 'path';

describe('Post Test', function() {
    let buildSourceArchiveToolkitsPath: string;
    let buildUtilsToolkitsPath: string;
    let simpleSplAppPath: string;

    it('Reset test directories and files', function(done) {
        buildSourceArchiveToolkitsPath = `${__dirname}${path.sep}build${path.sep}buildSourceArchive${path.sep}toolkits`;
        buildUtilsToolkitsPath = `${__dirname}${path.sep}build${path.sep}v5${path.sep}utils${path.sep}toolkits`;
        simpleSplAppPath = `${__dirname}${path.sep}resources${path.sep}splFiles${path.sep}simple`;

        try {
            if (fse.existsSync(buildSourceArchiveToolkitsPath)) {
                fse.removeSync(buildSourceArchiveToolkitsPath);
            }
            if (fse.existsSync(buildUtilsToolkitsPath)) {
                fse.removeSync(buildUtilsToolkitsPath);
            }
            glob('.build_test_*.zip', { cwd: simpleSplAppPath }, (err, files) => {
                if (err) {
                    done(err);
                }
                files.forEach((file: string) => fse.removeSync(path.resolve(simpleSplAppPath, file)));
            });
            done();
        } catch (err) {
            done(err);
        }
    });
});
