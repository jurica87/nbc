'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const scriptPath = path.join(__dirname, '../js/camp2027.js');
const valid = () => ({
    vorname: 'TEST-Kind', nachname: 'Keine echte Anmeldung', email: 'parent@example.invalid',
    geburtstag: '2017-04-15', strasse: 'Testweg', hausnummer: '1a', postleitzahl: '48531',
    ort: 'Nordhorn', festnetz: 'nicht vorhanden', mobilnummer: '+49 170 0000000',
    konfektionsgroesse: '140', freund: '', foto_video: 'Nein', sorgeberechtigt: 'Ja', datenschutz: 'gelesen'
});

test('builds a real email draft for the exact recipient and accepts photo refusal', () => {
    assert.ok(fs.existsSync(scriptPath), 'The camp email-preparation implementation is missing');
    const camp = require(scriptPath);
    const draft = camp.prepareRegistration(valid());
    const url = new URL(draft.mailto);
    assert.equal(url.protocol, 'mailto:');
    assert.equal(url.pathname, 'info@nbc-nordhorn.de');
    assert.match(url.searchParams.get('subject'), /1\. NBC Jugend Basketballcamp 2027/);
    assert.equal(url.searchParams.get('body'), draft.text);
    assert.match(draft.text, /Vorname des Kindes: TEST-Kind/);
    assert.match(draft.text, /Geburtstag: 15\.04\.2017/);
    assert.match(draft.text, /Foto\/Video: Nein/);
    assert.match(draft.text, /69 €/);
    assert.match(draft.text, /gelesen/);
    assert.match(draft.text, /noch keine Teilnahmebestätigung/);
    assert.match(draft.eml, /To: info@nbc-nordhorn\.de\r\n/);
    assert.match(draft.eml, /X-Unsent: 1\r\n/);
    assert.ok(!draft.eml.includes('From:'), 'Never invent the parent sender address');
    assert.equal(Buffer.from(draft.eml.split('\r\n\r\n')[1].replace(/\r\n/g, ''), 'base64').toString('utf8'), draft.text);
});

test('draft contains only whitelisted fields and cannot inject email headers', () => {
    const camp = require(scriptPath);
    const draft = camp.prepareRegistration({ ...valid(),
        vorname: 'TEST\r\nBcc: attacker@example.invalid',
        krankheiten: 'DO_NOT_EXPORT_HEALTH', allergien: 'DO_NOT_EXPORT_ALLERGY',
        essensvorschriften: 'DO_NOT_EXPORT_DIET', access_key: 'DO_NOT_EXPORT_KEY' });
    assert.ok(!draft.text.includes('DO_NOT_EXPORT'));
    const headers = draft.eml.split('\r\n\r\n')[0];
    assert.ok(!headers.includes('attacker@example.invalid'));
    assert.ok(!headers.includes('Bcc:'));
    assert.equal(new URL(draft.mailto).pathname, 'info@nbc-nordhorn.de');
    assert.equal(new URL(draft.mailto).searchParams.size, 2);
});

test('rejects incomplete registrations, invalid dates, wrong age years and missing consent choices', () => {
    const camp = require(scriptPath);
    for (const field of ['vorname', 'nachname', 'email', 'geburtstag', 'strasse', 'hausnummer',
                         'postleitzahl', 'ort', 'festnetz', 'mobilnummer', 'konfektionsgroesse',
                         'foto_video', 'sorgeberechtigt', 'datenschutz']) {
        assert.throws(() => camp.prepareRegistration({ ...valid(), [field]: '' }),
                      error => error.field === field, `Missing ${field} must block email preparation`);
    }
    for (const birthday of ['2014-12-31', '2021-01-01', '2017-02-29', '2019-02-30', '2017-13-01', '15.04.2017']) {
        assert.throws(() => camp.prepareRegistration({ ...valid(), geburtstag: birthday }),
                      error => error.field === 'geburtstag');
    }
    for (const [field, value] of [['email', 'bad address'], ['postleitzahl', '1234'],
                                 ['mobilnummer', 'abc'], ['foto_video', 'Vielleicht'],
                                 ['sorgeberechtigt', 'Nein'], ['datenschutz', 'Nein']]) {
        assert.throws(() => camp.prepareRegistration({ ...valid(), [field]: value }),
                      error => error.field === field);
    }
    for (const birthday of ['2015-01-01', '2020-12-31', '2016-02-29']) {
        assert.doesNotThrow(() => camp.prepareRegistration({ ...valid(), geburtstag: birthday }));
    }
});
