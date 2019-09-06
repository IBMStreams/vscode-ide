import { expect } from 'chai';
import * as fs from 'fs';
import { describe, it } from 'mocha';
import * as path from 'path';
import { StreamsToolkitsUtils } from '../../../../src/build/v5/util';

describe('streams-toolkits-utils', function() {
    let buildSourceArchiveToolkitsPath: string;
    let utilsToolkitsPath: string;
    let toolkitsCachePath: string;
    let expectedOutputLocalToolkits;
    let expectedOutputCachedToolkits;

    before(function() {
        buildSourceArchiveToolkitsPath = `${__dirname}${path.sep}..${path.sep}..${path.sep}buildSourceArchive${path.sep}toolkits${path.sep}streamsx.inet-2.9.6`;
        utilsToolkitsPath = `${__dirname}${path.sep}toolkits${path.sep}streamsx.inet-2.9.6`;
        toolkitsCachePath = `${__dirname}${path.sep}..${path.sep}..${path.sep}..${path.sep}..${path.sep}..${path.sep}toolkitsCache`;
    });

    describe('#getChangedLocalToolkits()', function() {
        let toolkits: { addedToolkitPaths: string[], removedToolkitNames: string[] };
        let expectedOutput: { addedToolkitPaths: string[], removedToolkitNames: string[] };

        it('add multiple toolkits and remove single toolkit', function() {
            toolkits = StreamsToolkitsUtils.getChangedLocalToolkits(buildSourceArchiveToolkitsPath, utilsToolkitsPath);
            expectedOutput = {
                addedToolkitPaths: [
                    `${utilsToolkitsPath}${path.sep}com.ibm.streamsx.inet${path.sep}toolkit.xml`,
                    `${utilsToolkitsPath}${path.sep}com.ibm.streamsx.inet2${path.sep}toolkit.xml`
                ],
                removedToolkitNames: [
                    'com.ibm.streamsx.inet'
                ]
            };
            expect(toolkits).to.deep.equal(expectedOutput);
        });

        it('add single toolkit and remove multiple toolkits', function() {
            toolkits = StreamsToolkitsUtils.getChangedLocalToolkits(utilsToolkitsPath, buildSourceArchiveToolkitsPath);
            expectedOutput = {
                addedToolkitPaths: [
                    `${buildSourceArchiveToolkitsPath}${path.sep}com.ibm.streamsx.inet${path.sep}toolkit.xml`
                ],
                removedToolkitNames: [
                    'com.ibm.streamsx.inet',
                    'com.ibm.streamsx.inet2'
                ]
            };
            expect(toolkits).to.deep.equal(expectedOutput);
        });
    });

    it('#getLocalToolkits()', function() {
        const toolkits = StreamsToolkitsUtils.getLocalToolkits(utilsToolkitsPath);
        expectedOutputLocalToolkits = [
            {
                name: 'com.ibm.streamsx.inet',
                version: '2.9.6',
                indexPath: `${utilsToolkitsPath}${path.sep}com.ibm.streamsx.inet${path.sep}toolkit.xml`,
                label: 'com.ibm.streamsx.inet - 2.9.6',
                isLocal: true
            },
            {
                name: 'com.ibm.streamsx.inet2',
                version: '2.9.6',
                indexPath: `${utilsToolkitsPath}${path.sep}com.ibm.streamsx.inet2${path.sep}toolkit.xml`,
                label: 'com.ibm.streamsx.inet2 - 2.9.6',
                isLocal: true
            }
        ];
        expect(toolkits).to.deep.equal(expectedOutputLocalToolkits);
    });

    describe('#getLocalToolkitIndexPaths()', function() {
        let indexPaths: string[];
        let expectedOutput: string[];

        it('should work with a single toolkit', function() {
            indexPaths = StreamsToolkitsUtils.getLocalToolkitIndexPaths(buildSourceArchiveToolkitsPath);
            expectedOutput = [`${buildSourceArchiveToolkitsPath}${path.sep}com.ibm.streamsx.inet${path.sep}toolkit.xml`];
            expect(indexPaths).to.deep.equal(expectedOutput);
        });

        it('should work with multiple toolkits', function() {
            indexPaths = StreamsToolkitsUtils.getLocalToolkitIndexPaths(utilsToolkitsPath);
            expectedOutput = [
                `${utilsToolkitsPath}${path.sep}com.ibm.streamsx.inet${path.sep}toolkit.xml`,
                `${utilsToolkitsPath}${path.sep}com.ibm.streamsx.inet2${path.sep}toolkit.xml`
            ];
            expect(indexPaths).to.deep.equal(expectedOutput);
        });
    });

    it('#getCachedToolkits()', function() {
        const cachedToolkits = StreamsToolkitsUtils.getCachedToolkits(toolkitsCachePath).map((toolkit) => {
            const file = toolkit.indexPath.replace(`${toolkitsCachePath}${path.sep}`, '');
            return file;
        });
        expectedOutputCachedToolkits = fs.readdirSync(toolkitsCachePath).filter((toolkit: string) => toolkit !== '.DS_Store');
        expect(cachedToolkits).to.deep.equal(expectedOutputCachedToolkits);
    });

    it('#getCachedToolkitIndexPaths()', function() {
        const cachedToolkitsIndex = StreamsToolkitsUtils.getCachedToolkitIndexPaths(toolkitsCachePath);
        const expectedOutput = expectedOutputCachedToolkits
            .filter((toolkit: string) => toolkit !== '.DS_Store')
            .map(toolkit => `${toolkitsCachePath}${path.sep}${toolkit}`);
        expect(cachedToolkitsIndex).to.deep.equal(expectedOutput);
    });

    it('#getAllToolkits()', function() {
        const toolkits = StreamsToolkitsUtils.getAllToolkits(toolkitsCachePath, utilsToolkitsPath).map((toolkit) => {
            const file = toolkit.indexPath.replace(`${toolkitsCachePath}${path.sep}`, '');
            return file;
        });
        const expectedIndexLocalToolkits = expectedOutputLocalToolkits.map((toolkit) => toolkit.indexPath);
        const expectedOutput = expectedOutputCachedToolkits.concat(expectedIndexLocalToolkits);
        expect(toolkits).to.deep.equal(expectedOutput);
    });
});
