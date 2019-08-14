import { expect } from 'chai';
import { describe } from 'mocha';
import { ConfigurationTarget, workspace } from 'vscode';
import { Configuration, Settings } from '../../src/utils';

describe('configuration', function() {
    const defaultIcp4dUrl = 'https://HOST:PORT';
    const defaultRequestTimeout = 30;

    after(async function() {
        await workspace.getConfiguration().update(Settings.ICP4D_URL, defaultIcp4dUrl, ConfigurationTarget.Global);
    });

    it('settings should have correct default values', function() {
        const config = workspace.getConfiguration();
        expect(config.inspect(Settings.ICP4D_URL).defaultValue).to.equal(defaultIcp4dUrl);
        expect(config.inspect(Settings.ICP4D_USE_MASTER_NODE_HOST).defaultValue).to.be.true;
        expect(config.inspect(Settings.REQUEST_TIMEOUT).defaultValue).to.equal(defaultRequestTimeout);
        expect(config.inspect(Settings.STREAMING_ANALYTICS_CREDENTIALS).defaultValue).to.be.null;
        expect(config.inspect(Settings.TARGET_VERSION).defaultValue).to.equal(Settings.TARGET_VERSION_OPTION.V4);
        expect(config.inspect(Settings.TOOLKIT_PATHS).defaultValue).to.equal(Settings.TOOLKIT_PATHS_DEFAULT);
        expect(config.inspect(Settings.TRACE_SERVER).defaultValue).to.equal(Settings.TRACE_SERVER_DEFAULT);
    });

    it('Streams color themes should be customized', function() {
        const expectedCustomizations = {
            '[Streams Light]': {
                'editor.selectionBackground': '#E2F5FF',
                'editorBracketMatch.background': '#7D7D7D66',
                'editorCursor.foreground': '#000000'
            },
            '[Streams Dark]': {
                'editor.selectionBackground': '#2F4F4F',
                'editorBracketMatch.background': '#7D7D7D66',
                'editorCursor.foreground': '#FFFFFF'
            }
        };
        expect(workspace.getConfiguration('workbench').get('colorCustomizations')).to.deep.equal(expectedCustomizations);
    });

    it('#setSetting/getSetting()', async function() {
        const testUrl = 'https://123.45.67.89:31843';
        await Configuration.setSetting(Settings.ICP4D_URL, testUrl);
        const value = Configuration.getSetting(Settings.ICP4D_URL);
        expect(value).to.equal(testUrl);
    });
});
