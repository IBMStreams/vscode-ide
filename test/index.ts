import * as path from 'path';

import glob = require('glob');
import Mocha = require('mocha');

// eslint-disable-next-line import/prefer-default-export
export function run(): Promise<void> {
  // Create the Mocha test
  const mocha = new Mocha({ ui: 'bdd', timeout: 5000 });
  mocha.useColors(true);

  return new Promise((c, e) => {
    glob('**/**.test.js', { cwd: __dirname }, (err, files) => {
      if (err) {
        return e(err);
      }

      const preTestFile = 'pre.test.js';
      const postTestFile = 'post.test.js';
      const testFiles = [
        files.find((file) => file === preTestFile),
        ...files.filter(
          (file) => file !== preTestFile && file !== postTestFile
        ),
        files.find((file) => file === postTestFile)
      ];

      // Add files to the test suite
      testFiles.forEach((file: string) =>
        mocha.addFile(path.resolve(__dirname, file))
      );

      try {
        // Run the Mocha test
        mocha.run((failures) => {
          if (failures > 0) {
            e(new Error(`${failures} tests failed.`));
          } else {
            c();
          }
        });
      } catch (error) {
        e(error);
      }
      return null;
    });
  });
}
