/* Share only public camp information; never read registration fields. */
(function (root, factory) {
    'use strict';
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root && root.document) {
        root.NBCCampShare = api;
        api.mount(root.document, root.navigator);
    }
}(typeof window !== 'undefined' ? window : null, function () {
    'use strict';
    function getShareData() {
        return {
            title: '1. NBC Jugend Basketballcamp 2027',
            text: '1. NBC Jugend Basketballcamp am 30. und 31. Januar 2027 im Gymnasium Nordhorn. Jahrgänge 2010–2018 · Kostenbeitrag 69 €.',
            url: 'https://nbc-nordhorn.de/Camp2027.html'
        };
    }
    function mount(doc, navigator) {
        const input = doc.getElementById('camp-share-url');
        const status = doc.getElementById('camp-share-status');
        const copy = doc.getElementById('camp-share-copy');
        if (!input || !status || !copy) return;
        navigator = navigator || {};
        input.value = getShareData().url;
        const selectPublicLink = message => {
            input.value = getShareData().url;
            input.focus();
            input.select();
            status.textContent = message;
        };
        copy.hidden = false;
        copy.addEventListener('click', async () => {
            copy.disabled = true;
            try {
                await navigator.clipboard.writeText(getShareData().url);
                status.textContent = 'Link kopiert.';
            } catch (_) {
                selectPublicLink('Bitte den markierten Link manuell kopieren.');
            } finally {
                copy.disabled = false;
            }
        });
        const native = doc.getElementById('camp-share-native');
        if (native && typeof navigator.share === 'function') {
            native.hidden = false;
            native.addEventListener('click', async () => {
                native.disabled = true;
                try {
                    await navigator.share(getShareData());
                    status.textContent = 'Link an das Teilen-Menü übergeben.';
                } catch (error) {
                    if (error && error.name === 'AbortError') status.textContent = 'Teilen abgebrochen.';
                    else selectPublicLink('Teilen ist hier nicht verfügbar. Bitte den markierten Link kopieren.');
                } finally {
                    native.disabled = false;
                }
            });
        }
    }
    return Object.freeze({ getShareData, mount });
}));
