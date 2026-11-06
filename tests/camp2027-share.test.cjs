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
    const elements = Object.fromEntries(['camp-share-url', 'camp-share-copy', 'camp-share-native', 'camp-share-status', 'camp-share-instagram'].map(id => [id, {
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

class PublicImageFile extends Blob {
    constructor(parts, name, options) { super(parts, options); this.name = name; }
}

test('Instagram prepares a public JPEG before click and shares only the file, not form data or URL', async () => {
    const { elements, document } = controls();
    const sharing = require(script);
    let fetched, payload, requested;
    const fetchImage = async (url, options) => {
        fetched = { url, options };
        return { ok: true, async blob() { return new Blob(['public-poster-bytes'], { type: 'image/jpeg' }); } };
    };
    const navigator = { canShare(data) { requested = data; return data.files[0].type === 'image/jpeg'; }, async share(data) { payload = data; } };
    assert.equal(await sharing.mountInstagram(document, navigator, fetchImage, PublicImageFile), true);
    assert.equal(fetched.url, './images/camp2027-poster-original.jpg');
    assert.equal(fetched.options.credentials, 'omit');
    assert.equal(fetched.options.mode, 'same-origin');
    assert.equal(elements['camp-share-instagram'].hidden, false);
    assert.equal(elements['camp-share-instagram'].disabled, false);
    assert.equal(payload, undefined, 'Preparing the file must not open or post to an app');
    await elements['camp-share-instagram'].handlers.click();
    assert.deepEqual(Object.keys(payload), ['files']);
    assert.equal(payload.files[0], requested.files[0]);
    assert.equal(payload.files[0].type, 'image/jpeg');
    assert.equal(payload.files[0].name, 'NBC-Camp-2027-Instagram.jpg');
    assert.equal(await payload.files[0].text(), 'public-poster-bytes');
    assert.match(elements['camp-share-status'].textContent, /Teilen-Menü/);
});

test('Instagram hides image sharing without required APIs and never fetches unsupported environments', async () => {
    const sharing = require(script);
    for (const navigator of [undefined, {}, { share() {} }, { canShare() { return true; } }]) {
        const { elements, document } = controls();
        assert.equal(await sharing.mountInstagram(document, navigator, () => { assert.fail('Unsupported browser must not fetch'); }, PublicImageFile), false);
        assert.equal(elements['camp-share-instagram'].hidden, true);
        assert.equal(elements['camp-share-instagram'].handlers.click, undefined);
    }
});

test('Instagram download remains the fallback for rejected files, HTTP failures and blocked capability checks', async () => {
    const sharing = require(script);
    const jpeg = { ok: true, async blob() { return new Blob(['poster'], { type: 'image/jpeg' }); } };
    const rejected = [
        { response: { ok: false } },
        { response: { ok: true, async blob() { return new Blob(['error html'], { type: 'text/html' }); } } },
        { response: { ok: true, async blob() { return new Blob([], { type: 'image/jpeg' }); } } },
        { response: jpeg, canShare: () => false },
        { response: jpeg, canShare() { throw new Error('Permission policy blocked'); } },
        { networkError: true }
    ];
    for (const scenario of rejected) {
        const { elements, document } = controls();
        const navigator = { canShare: scenario.canShare || (() => true), share() { assert.fail('Never share while preparing'); } };
        const fetchImage = async () => { if (scenario.networkError) throw new Error('Network blocked'); return scenario.response; };
        assert.equal(await sharing.mountInstagram(document, navigator, fetchImage, PublicImageFile), false);
        assert.equal(elements['camp-share-instagram'].hidden, true);
        assert.equal(elements['camp-share-instagram'].handlers.click, undefined);
    }
});

test('Instagram distinguishes cancellation from failed file handoff without claiming a post', async () => {
    const sharing = require(script);
    for (const name of ['AbortError', 'NotAllowedError', 'InvalidStateError']) {
        const { elements, document } = controls();
        const navigator = { canShare() { return true; }, async share() { const error = new Error(name); error.name = name; throw error; } };
        await sharing.mountInstagram(document, navigator, async () => ({ ok: true, async blob() { return new Blob(['poster'], { type: 'image/jpeg' }); } }), PublicImageFile);
        await elements['camp-share-instagram'].handlers.click();
        assert.equal(elements['camp-share-instagram'].disabled, false);
        if (name === 'AbortError') assert.equal(elements['camp-share-status'].textContent, 'Bild-Teilen abgebrochen.');
        else assert.match(elements['camp-share-status'].textContent, /Bild herunterladen/);
        assert.doesNotMatch(elements['camp-share-status'].textContent, /veröffentlicht|erfolgreich geteilt/);
        assert.equal(elements['camp-share-url'].selected, undefined);
    }
});
