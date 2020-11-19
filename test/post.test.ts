import * as fse from 'fs-extra';
import { describe, it } from 'mocha';
import * as path from 'path';

import glob = require('glob');

describe('post-test', function () {
  let buildSourceArchiveToolkitsPath: string;
  let simpleSplAppPath: string;

  it('reset test directories and files', function (done) {
    buildSourceArchiveToolkitsPath = `${__dirname}${path.sep}build${path.sep}buildSourceArchive${path.sep}toolkits`;
    simpleSplAppPath = `${__dirname}${path.sep}resources${path.sep}splFiles${path.sep}simple`;

    try {
      if (fse.existsSync(buildSourceArchiveToolkitsPath)) {
        fse.removeSync(buildSourceArchiveToolkitsPath);
      }
      glob('.build_test_*.zip', { cwd: simpleSplAppPath }, (err, files) => {
        if (err) {
          done(err);
        }
        files.forEach((file: string) =>
          fse.removeSync(path.resolve(simpleSplAppPath, file))
        );
      });
      done();
    } catch (err) {
      done(err);
    }
  });
});
