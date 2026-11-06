'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const script = path.join(__dirname, '../js/camp2027-share.js');
const canonical = 'https://nbc-nordhorn.de/Camp2027.html';

test('share data stays canonical, public and independent of registration inputs', () => {
    assert.ok(fs.existsSync(script), 'Local camp sharing implementation is missing');
    const sharing = require(script);
    const data = sharing.getShareData({ url: 'https://example.invalid/?email=PRIVATE' });
    assert.equal(data.url, canonical);
    assert.match(data.title, /NBC Jugend Basketballcamp 2027/);
    assert.match(data.text, /30\. und 31\. Januar 2027/);
    assert.match(data.text, /2010–2018/);
    assert.deepEqual(Object.keys(data).sort(), ['text', 'title', 'url']);
    assert.ok(!JSON.stringify(data).includes('PRIVATE'));
    data.url = 'https://example.invalid/changed';
    assert.equal(sharing.getShareData().url, canonical);
});

// Minimal DOM boundary; actual layout, clipboard and downloads are browser-tested.
function controls() {
    const elements = Object.fromEntries(['camp-share-url', 'camp-share-copy', 'camp-share-native', 'camp-share-status'].map(id => [id, {
        hidden: true, disabled: false, value: canonical, textContent: '', handlers: {},
        addEventListener(type, handler) { this.handlers[type] = handler; },
        focus() { this.focused = true; }, select() { this.selected = true; }
    }]));
    const document = { getElementById(id) {
        assert.ok(Object.hasOwn(elements, id), 'Sharing must not read registration fields: ' + id);
        return elements[id];
    } };
    return { elements, document };
}

test('copy writes only the canonical camp link and enables its control', async () => {
    const { elements, document } = controls();
    let copied;
    const sharing = require(script);
    sharing.mount(document, { clipboard: { async writeText(text) { copied = text; } } });
    assert.equal(elements['camp-share-copy'].hidden, false);
    assert.equal(elements['camp-share-native'].hidden, true);
    await elements['camp-share-copy'].handlers.click();
    assert.equal(copied, canonical);
    assert.equal(elements['camp-share-status'].textContent, 'Link kopiert.');
    assert.equal(elements['camp-share-copy'].disabled, false);
});

test('missing or denied clipboard selects a public link instead of claiming success', async () => {
    const sharing = require(script);
    for (const navigator of [{}, { clipboard: { async writeText() { throw new Error('Denied'); } } }]) {
        const { elements, document } = controls();
        sharing.mount(document, navigator);
        elements['camp-share-url'].value = 'PRIVATE';
        await elements['camp-share-copy'].handlers.click();
        assert.equal(elements['camp-share-url'].value, canonical);
        assert.equal(elements['camp-share-url'].focused, true);
        assert.equal(elements['camp-share-url'].selected, true);
        assert.match(elements['camp-share-status'].textContent, /markierten Link/);
        assert.notEqual(elements['camp-share-status'].textContent, 'Link kopiert.');
        assert.equal(elements['camp-share-copy'].disabled, false);
    }
});

test('native share passes only public camp data when supported', async () => {
    const { elements, document } = controls();
    const sharing = require(script);
    let payload;
    sharing.mount(document, { async share(data) { payload = data; } });
    assert.equal(elements['camp-share-native'].hidden, false);
    await elements['camp-share-native'].handlers.click();
    assert.deepEqual(payload, sharing.getShareData());
    assert.match(elements['camp-share-status'].textContent, /Teilen-Menü/);
    assert.equal(elements['camp-share-native'].disabled, false);
});

test('native cancellation is distinct from provider failure and exposes a manual fallback', async () => {
    const sharing = require(script);
    for (const name of ['AbortError', 'NotAllowedError']) {
        const { elements, document } = controls();
        sharing.mount(document, { async share() { const error = new Error(name); error.name = name; throw error; } });
        await elements['camp-share-native'].handlers.click();
        assert.equal(elements['camp-share-native'].disabled, false);
        if (name === 'AbortError') {
            assert.equal(elements['camp-share-status'].textContent, 'Teilen abgebrochen.');
            assert.equal(elements['camp-share-url'].selected, undefined);
        } else {
            assert.match(elements['camp-share-status'].textContent, /markierten Link/);
            assert.equal(elements['camp-share-url'].selected, true);
            assert.equal(elements['camp-share-url'].value, canonical);
        }
    }
});

test('browser script automatically mounts sharing without touching the registration form', () => {
    const { elements, document } = controls();
    const window = { document, navigator: {} };
    require('node:vm').runInNewContext(fs.readFileSync(script, 'utf8'), { window });
    assert.equal(typeof window.NBCCampShare.getShareData, 'function');
    assert.equal(elements['camp-share-copy'].hidden, false);
    assert.equal(typeof elements['camp-share-copy'].handlers.click, 'function');
});
