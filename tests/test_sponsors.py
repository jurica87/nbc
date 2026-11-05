"""Sponsor-carousel regression checks; standard-library unittest only."""
from html.parser import HTMLParser
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
NEW_SPONSORS = {
    './sponsors/dmg-nordhorn-logo.png': ('DMG Nordhorn Logo', 'https://dmg-nordhorn.de/'),
    './sponsors/uelsener-massivbau-logo.png': ('Uelsener Massivbau Logo', 'https://uelsener-massivbau.de/'),
    './sponsors/proquartis-logo.png': ('ProQuartis Logo', 'https://proquartis.de/'),
    './sponsors/hermann-schulten-logo.png': ('Hermann Schulten GmbH Logo', 'https://www.hermann-schulten.de/'),
}


class SponsorLinks(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.links = []
        self.current = None
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'a':
            self.current = attrs
        elif tag == 'img' and self.current is not None:
            self.links.append((self.current, attrs))

    def handle_endtag(self, tag):
        if tag == 'a':
            self.current = None


class SponsorTests(unittest.TestCase):
    def test_reduced_motion_wraps_the_complete_sponsor_strip(self):
        html = (ROOT / 'index.html').read_text()
        rule = re.search(r'@media \(prefers-reduced-motion: reduce\).*?'
                         r'\.sponsor-slider \.sponsor-track\s*\{([^}]+)', html, re.S)
        self.assertIsNotNone(rule, 'Static mode needs a bounded-width track so all logos wrap')
        assert rule is not None
        self.assertRegex(rule.group(1), r'width:\s*100%;')
        self.assertRegex(rule.group(1), r'flex-wrap:\s*wrap;')

    def test_four_new_sponsors_present_in_both_seamless_loop_sets(self):
        html = (ROOT / 'index.html').read_text()
        sets = re.findall(r'<div class="sponsor-set\b[^>]*>(.*?)</div>', html, re.S)
        self.assertEqual(len(sets), 2)
        groups = [SponsorLinks(part).links for part in sets]
        for group_index, group in enumerate(groups):
            for src, (alt, url) in NEW_SPONSORS.items():
                matches = [(a, i) for a, i in group if i.get('src') == src]
                self.assertEqual(len(matches), 1, f'{src} missing or duplicated in set {group_index}')
                anchor, image = matches[0]
                self.assertEqual(anchor.get('href'), url)
                self.assertEqual(anchor.get('target'), '_blank')
                self.assertIn('noopener', anchor.get('rel', '').split())
                self.assertIn('sponsor-logo', anchor.get('class', '').split())
                self.assertIn('object-contain', image.get('class', '').split())
                self.assertEqual(image.get('alt'), alt if group_index == 0 else '')
                if group_index == 1:
                    self.assertEqual(anchor.get('tabindex'), '-1')
                self.assertTrue((ROOT / src).is_file())
                self.assertTrue((ROOT / src).read_bytes().startswith(b'\x89PNG\r\n\x1a\n'))
        self.assertEqual([(a['href'], i['src']) for a, i in groups[0]],
                         [(a['href'], i['src']) for a, i in groups[1]])
        for original in ['rewe-rafael-doering-logo.jpg', 'ala-turka-logo.png',
                         'grafschafter-volksbank-logo.png', 'nvb-logo.png', 'wink-logo.png',
                         'sparkasse-nordhorn-logo.png', 'elektro-iss-logo.png',
                         'jb-kupers-logo.svg', 'neuenhauser-maschinenbau-logo.jpg']:
            self.assertTrue(any(i['src'] == './sponsors/' + original for _, i in groups[0]))


if __name__ == '__main__':
    unittest.main()
