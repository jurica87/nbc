"""Acceptance checks for the supplied home-weekend report and photo."""
from html.parser import HTMLParser
from datetime import datetime
from pathlib import Path
import json
import re
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SLUG = 'volle-halle-fuenf-siege-heimspielwochenende-2026.html'
URL = 'https://nbc-nordhorn.de/news/' + SLUG
TITLE = 'Volle Halle, fünf Siege: Starkes Heimwochenende für die NBC Baskets'


class Tags(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.tags = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


def schema(html):
    match = re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
    if match is None:
        raise AssertionError('JSON-LD block is missing')
    return json.loads(match.group(1))


class HomeWeekendNewsTests(unittest.TestCase):
    def article(self):
        path = ROOT / 'news' / SLUG
        self.assertTrue(path.is_file(), 'Requested normal news article is missing')
        return path.read_text()

    def test_article_preserves_all_five_reported_results_and_names(self):
        html = self.article()
        results = dict(re.findall(r'<li data-team="([^"]+)">(.*?)</li>', html, re.S))
        expected = {
            'herren-1': ('107:51', 'Damme'),
            'damen': ('95:16', 'BBC Osnabrück III'),
            'herren-2': ('86:44', 'VfL Löningen IV'),
            'u12': ('91:71', 'Rasta Vechta'),
            'u14': ('69:60', 'TV Meppen'),
        }
        self.assertEqual(set(results), set(expected))
        for team, values in expected.items():
            for value in values:
                self.assertIn(value, results[team])
        for phrase in ['Niklas Kraffzig', 'Patrick Olliges', 'Ludwig-Povel-Schule', 'U18', 'kurzfristig',
                       'Holger Wilkens', 'Grafschafter Nachrichten', 'philippheils.jpg']:
            self.assertIn(phrase, html)
        self.assertTrue('Foto: Philipp Heils' in html, 'Requested photographer name must be visible')
        self.assertTrue('Bericht: Holger Wilkens (Grafschafter Nachrichten vom 25.11.2026)' in html,
                        'Use the newspaper attribution and print date supplied by NBC')
        self.assertIn('https://www.gn-online.de/sport/neuer-verein-auf-dem-hoehenflug-volle-halle-viele-siege-629457.html', html)
        self.assertNotIn('Udo Wohlrab', html, 'The supplied photo has a different photographer than the clipping')
        self.assertNotIn('am vergangenen Wochenende', html, 'Do not invent an exact event date')

    def test_article_metadata_photo_and_shared_social_component(self):
        html = self.article()
        tags = Tags(html).tags
        self.assertIn(TITLE, html)
        self.assertEqual(sum(t == 'h1' for t, _ in tags), 1)
        self.assertTrue(any(t == 'link' and a.get('rel') == 'canonical' and a.get('href') == URL for t, a in tags))
        data = next(x for x in schema(html)['@graph'] if x['@type'] == 'NewsArticle')
        self.assertEqual(data['headline'], TITLE)
        self.assertEqual(data['mainEntityOfPage']['@id'], URL)
        self.assertEqual(data['datePublished'][:10], '2026-11-25')
        self.assertGreaterEqual(datetime.fromisoformat(data['dateModified']),
                                datetime.fromisoformat(data['datePublished']))
        self.assertEqual(data['author']['name'], 'NBC Baskets Nordhorn e.V.')
        self.assertTrue(any(t == 'time' and a.get('datetime') == '2026-11-25' for t, a in tags))
        hero = next(a for t, a in tags if t == 'img' and a.get('src') == '../images/heimspielwochenende-2026-1600.webp')
        self.assertEqual((hero['width'], hero['height']), ('1600', '1000'))
        self.assertIn('800w', hero.get('srcset', ''))
        self.assertTrue(hero.get('alt'))
        for size in [800, 1600]:
            image = ROOT / 'images' / f'heimspielwochenende-2026-{size}.webp'
            self.assertTrue(image.is_file())
            self.assertEqual(image.read_bytes()[8:12], b'WEBP')
        original = ROOT / 'images/heimspielwochenende-2026-original.jpg'
        self.assertTrue(original.is_file())
        self.assertIn('../images/heimspielwochenende-2026-original.jpg', html)
        self.assertIn('../css/social-share.css', html)
        self.assertIn('nbc-share-whatsapp', html)
        self.assertIn('nbc-share-facebook', html)
        self.assertIn('Link kopieren', html)
        self.assertTrue('#article-share-copy[hidden] { display: none; }' in html,
                        'Copy control must remain hidden until JavaScript mounts it')
        self.assertNotIn('feed.xml', html)

    def test_news_archive_has_a_bounded_single_column_on_narrow_screens(self):
        overview = (ROOT / 'news.html').read_text()
        self.assertTrue('grid grid-cols-1 md:grid-cols-2 gap-6 break-words' in overview,
                        'Archive grid must not expand to the longest headline at 320px')

    def test_homepage_news_list_schema_and_sitemap_expose_the_article(self):
        homepage = (ROOT / 'index.html').read_text()
        overview = (ROOT / 'news.html').read_text()
        self.assertIn('./news/' + SLUG, homepage)
        self.assertIn('./news/' + SLUG, overview)
        items = next(x for x in schema(overview)['@graph'] if x['@type'] == 'ItemList')['itemListElement']
        self.assertEqual(items[0]['url'], URL)
        self.assertEqual([x['position'] for x in items], list(range(1, len(items) + 1)))
        self.assertEqual(len({x['url'] for x in items}), len(items))
        self.assertIn(str(len(items)) + ' Artikel', overview)
        locs = [x.text for x in ET.parse(ROOT / 'sitemap.xml').findall('.//{*}loc')]
        self.assertEqual(locs.count(URL), 1)
        self.assertIn('elektro-iss-trainingsanzuege-2026.html', homepage)
        self.assertIn('turniersieg-spelle-2026.html', overview)


if __name__ == '__main__':
    unittest.main()
