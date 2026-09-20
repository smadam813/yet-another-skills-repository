'use strict';

// settingsFromEnv reads every Core flag and cap the tool-output hook uses,
// once per hook fire, from the environment object it is handed. Names,
// defaults, and off tokens are the ones the README documents.

const { test, describe } = require('node:test');
const assert = require('node:assert');
require('./helpers');
const { settingsFromEnv } = require('../hooks/compress-tool-output');

describe('settingsFromEnv', () => {
  test('an empty environment yields the documented defaults', () => {
    assert.deepStrictEqual(settingsFromEnv({}), {
      capPass: 60,
      capFail: 250,
      sidecarMin: 15000,
      sidecarShellMax: 28000,
      template: true,
      sidecar: true,
      adaptive: true,
      grep: true,
      note: true,
    });
  });

  test('the result is frozen', () => {
    assert.ok(Object.isFrozen(settingsFromEnv({})));
  });

  test('caps parse as positive integers and fall back otherwise', () => {
    assert.strictEqual(settingsFromEnv({ HUSH_CAP_PASS: '80' }).capPass, 80);
    assert.strictEqual(settingsFromEnv({ HUSH_CAP_FAIL: '300' }).capFail, 300);
    assert.strictEqual(settingsFromEnv({ HUSH_SIDECAR_MIN: '9000' }).sidecarMin, 9000);
    assert.strictEqual(settingsFromEnv({ HUSH_SIDECAR_SHELL_MAX: '18000' }).sidecarShellMax, 18000);
    assert.strictEqual(settingsFromEnv({ HUSH_CAP_PASS: '0' }).capPass, 60);
    assert.strictEqual(settingsFromEnv({ HUSH_CAP_PASS: '-5' }).capPass, 60);
    assert.strictEqual(settingsFromEnv({ HUSH_CAP_PASS: 'lots' }).capPass, 60);
    assert.strictEqual(settingsFromEnv({ HUSH_CAP_PASS: '' }).capPass, 60);
  });

  test('a switch is off only on the exact token "off"', () => {
    for (const [name, key] of [
      ['HUSH_TEMPLATE', 'template'],
      ['HUSH_SIDECAR', 'sidecar'],
      ['HUSH_ADAPTIVE', 'adaptive'],
      ['HUSH_GREP', 'grep'],
      ['HUSH_NOTE', 'note'],
    ]) {
      assert.strictEqual(settingsFromEnv({ [name]: 'off' })[key], false, `${name}=off`);
      assert.strictEqual(settingsFromEnv({ [name]: 'OFF' })[key], true, `${name}=OFF stays on`);
      assert.strictEqual(settingsFromEnv({ [name]: '0' })[key], true, `${name}=0 stays on`);
      assert.strictEqual(settingsFromEnv({ [name]: '' })[key], true, `${name}= stays on`);
      assert.strictEqual(settingsFromEnv({ [name]: 'on' })[key], true, `${name}=on`);
    }
  });

  test('a missing environment reads as empty', () => {
    assert.deepStrictEqual(settingsFromEnv(undefined), settingsFromEnv({}));
  });
});
