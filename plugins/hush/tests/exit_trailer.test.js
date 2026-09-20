'use strict';

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { bashTrailer, powershellTrailer, decode, hasTrailer, PREFIX } = require('../hooks/lib/exit-trailer');

// What each shell prints when it runs its trailer statements. bash echoes
// the three lines with LF; PowerShell writes them with CRLF.
function bashOutput(code) {
  return `[[hush:exit=\n${code}\n]]`;
}
function powershellOutput(code) {
  return `[[hush:exit=\r\n${code}\r\n]]`;
}

describe('unit: round trip', () => {
  test('the bash trailer decodes to the code the shell printed', () => {
    const stmts = bashTrailer();
    assert.match(stmts, /^__hush_exit=\$\?\necho '\[\[hush:exit='\necho \$__hush_exit\necho '\]\]'$/);
    const r = decode(`build output\n${bashOutput(3)}`);
    assert.deepStrictEqual(r, { exitCode: 3, cleanText: 'build output' });
  });

  test('the PowerShell trailer decodes to the code the shell printed', () => {
    const stmts = powershellTrailer();
    assert.match(stmts, /^Write-Output '\[\[hush:exit='\n\$LASTEXITCODE\nWrite-Output '\]\]'$/);
    const r = decode(`about to fail\r\n${powershellOutput(1)}`);
    assert.deepStrictEqual(r, { exitCode: 1, cleanText: 'about to fail' });
  });

  test('a zero exit code decodes as 0, not as missing', () => {
    const r = decode(`all good\n${bashOutput(0)}`);
    assert.strictEqual(r.exitCode, 0);
  });

  test('a negative exit code decodes', () => {
    const r = decode(`x\n${powershellOutput(-1)}`);
    assert.strictEqual(r.exitCode, -1);
  });
});

describe('unit: decode', () => {
  test('returns null when no trailer text is present', () => {
    assert.strictEqual(decode('plain output'), null);
    assert.strictEqual(decode(undefined), null);
    assert.strictEqual(decode(42), null);
  });

  // PowerShell only sets $LASTEXITCODE for a native executable. A pure-cmdlet
  // command leaves it unset, and the trailer body comes back empty.
  test('a malformed trailer is stripped and reports no exit code', () => {
    const r = decode('output\r\n[[hush:exit=\r\n\r\n]]');
    assert.deepStrictEqual(r, { exitCode: null, cleanText: 'output' });
  });

  // A sidecar file that captured raw output with a trailer, read back through
  // a wrapped cmdlet, carries a well-formed trailer and then a malformed one.
  test('a doubled trailer strips both and reports the last well-formed code', () => {
    const r = decode(`line one\nline two\n${bashOutput(1)}\n[[hush:exit=\n]]`);
    assert.strictEqual(r.exitCode, 1);
    assert.strictEqual(r.cleanText, 'line one\nline two');
    const stray = decode(`saw a stray ${bashOutput(99)} in a log\nreal\n${bashOutput(1)}`);
    assert.strictEqual(stray.exitCode, 1);
    assert.doesNotMatch(stray.cleanText, /\[\[hush:exit=/);
  });

  test('collapses the blank lines a stripped trailer leaves behind', () => {
    const r = decode(`a\n\n${bashOutput(0)}\n\n\nb\n${bashOutput(0)}\n\n`);
    assert.strictEqual(r.cleanText, 'a\n\nb');
  });

  // The host truncates raw output around 29KB and can cut a trailer in two.
  test('a trailer cut by host truncation is left as is and yields no code', () => {
    const r = decode('output\n[[hush:exit=\n1');
    assert.strictEqual(r.exitCode, null);
    assert.strictEqual(r.cleanText, 'output\n[[hush:exit=\n1');
  });

  test('leaves the literal prefix inside source text alone', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'hooks', 'lib', 'exit-trailer.js'), 'utf8');
    const r = decode(src);
    assert.strictEqual(r.exitCode, null);
    assert.strictEqual(r.cleanText, src.replace(/\s+$/, ''));
  });
});

describe('unit: hasTrailer', () => {
  test('true for a well-formed and for a malformed trailer', () => {
    assert.strictEqual(hasTrailer(`x\n${bashOutput(2)}`), true);
    assert.strictEqual(hasTrailer('x\n[[hush:exit=\n]]'), true);
  });

  test('false for a cut trailer, a bare prefix, and a non-string', () => {
    assert.strictEqual(hasTrailer('x\n[[hush:exit=\n1'), false);
    assert.strictEqual(hasTrailer(`const P = "${PREFIX}";`), false);
    assert.strictEqual(hasTrailer(undefined), false);
  });

  test('carries no state between calls', () => {
    const text = `x\n${bashOutput(2)}`;
    assert.strictEqual(hasTrailer(text), true);
    assert.strictEqual(hasTrailer(text), true);
  });
});
