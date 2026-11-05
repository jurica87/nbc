"""Homepage regression checks. Run: python3 -m unittest discover -s tests -v"""
from html.parser import HTMLParser
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class Elements(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.tags = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


class HomepageTests(unittest.TestCase):
    def test_achievements_reachable_from_desktop_mobile_and_footer(self):
        html = (ROOT / 'index.html').read_text()
        nav = re.search(r'<nav\b.*?</nav>', html, re.S)
        footer = re.search(r'<footer\b.*?</footer>', html, re.S)
        assert nav is not None and footer is not None
        self.assertEqual(nav.group().count('href="#erfolge"'), 2,
                         'Desktop and mobile navigation each need an achievements link')
        self.assertIn('href="#erfolge"', footer.group())
        mobile = re.search(r'id="mobile-menu"(.*?)</nav>', nav.group(), re.S)
        assert mobile is not None
        link = next(attrs for tag, attrs in Elements(mobile.group()).tags
                    if tag == 'a' and attrs.get('href') == '#erfolge')
        self.assertEqual(link.get('onclick'), 'closeMenu()')

    def test_hall_of_fame_shows_documented_achievements_with_full_images(self):
        html = (ROOT / 'index.html').read_text()
        match = re.search(r'<section\b[^>]*id="erfolge"[^>]*>(.*?)</section>', html, re.S)
        self.assertIsNotNone(match, 'Homepage needs a dedicated achievements section')
        assert match is not None
        section = match.group(0)
        self.assertIn('HALL OF FAME', section)
        self.assertIn('aria-labelledby="erfolge-title"', section)
        for title in ['Sterne des Sports', 'Turniersieg in Spelle', 'Sascha Weirich']:
            self.assertIn(title, section)
        elements = Elements(section).tags
        self.assertEqual(sum(tag == 'article' for tag, _ in elements), 3)
        images = [attrs for tag, attrs in elements if tag == 'img']
        self.assertEqual(len(images), 3)
        links = [attrs['href'] for tag, attrs in elements if tag == 'a']
        for image in images:
            self.assertTrue(image.get('alt'))
            self.assertEqual(image.get('loading'), 'lazy')
            self.assertIn('object-contain', image.get('class', ''))
            self.assertGreater(int(image['width']), 0)
            self.assertGreater(int(image['height']), 0)
            self.assertTrue((ROOT / image['src']).is_file())
            self.assertIn(image['src'], links, 'Original photo must be accessible at full size')
        for article in ['./news/sterne-des-sports-2026.html', './news/turniersieg-spelle-2026.html']:
            self.assertIn(article, links)
            self.assertTrue((ROOT / article).is_file())
        ids = [attrs['id'] for _, attrs in Elements(html).tags if 'id' in attrs]
        self.assertEqual(len(ids), len(set(ids)), 'Homepage IDs must be unique')


if __name__ == '__main__':
    unittest.main()
