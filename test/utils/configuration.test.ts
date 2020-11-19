import { expect } from 'chai';
import { describe } from 'mocha';
import { workspace } from 'vscode';
import { Configuration, Settings } from '../../src/utils';

describe('configuration', function () {
  after(async function () {
    await Configuration.setSetting(
      Settings.ENV_TIMEOUT_FOR_REQUESTS,
      Settings.ENV_TIMEOUT_FOR_REQUESTS_DEFAULT
    );
  });

  it('settings should have correct default values', function () {
    const config = workspace.getConfiguration();
    expect(config.inspect(Settings.ENV_REFRESH_INTERVAL).defaultValue).to.equal(
      Settings.ENV_REFRESH_INTERVAL_DEFAULT
    );
    expect(
      config.inspect(Settings.ENV_TIMEOUT_FOR_REQUESTS).defaultValue
    ).to.equal(Settings.ENV_TIMEOUT_FOR_REQUESTS_DEFAULT);
    expect(config.inspect(Settings.ENV_TOOLKIT_PATHS).defaultValue).to.equal(
      Settings.ENV_TOOLKIT_PATHS_DEFAULT
    );
    expect(config.inspect(Settings.LOG_LEVEL).defaultValue).to.equal(
      Settings.LOG_LEVEL_DEFAULT
    );
    expect(config.inspect(Settings.SERVER_MODE).defaultValue).to.equal(
      Settings.SERVER_MODE_DEFAULT
    );
    expect(config.inspect(Settings.SERVER_PORT).defaultValue).to.equal(
      Settings.SERVER_PORT_DEFAULT
    );
    expect(config.inspect(Settings.TRACE_SERVER).defaultValue).to.equal(
      Settings.TRACE_SERVER_DEFAULT
    );
  });

  it('Streams color themes should be customized', function () {
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
    expect(
      workspace.getConfiguration('workbench').get('colorCustomizations')
    ).to.deep.equal(expectedCustomizations);
  });

  it('#setSetting/getSetting()', async function () {
    const testValue = 10;
    await Configuration.setSetting(
      Settings.ENV_TIMEOUT_FOR_REQUESTS,
      testValue
    );
    const value = Configuration.getSetting(Settings.ENV_TIMEOUT_FOR_REQUESTS);
    expect(value).to.equal(testValue);
  });
});
