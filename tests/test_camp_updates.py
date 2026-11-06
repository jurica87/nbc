"""Regression coverage for the approved camp notice and size-hint updates."""
from pathlib import Path
from html.parser import HTMLParser
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class Inputs(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.inputs = []
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        if tag == 'input':
            self.inputs.append(dict(attrs))


class CampUpdatesTests(unittest.TestCase):
    def test_minimum_notice_is_unique_and_last_in_parent_text(self):
        html = (ROOT / 'Camp2027.html').read_text()
        intro = re.search(r'<div class="intro-copy">(.*?)</div>', html, re.S)
        assert intro is not None
        notice = re.search(r'<p id="camp-minimum-note">(.*?)</p>\s*$', intro.group(1), re.S)
        assert notice is not None, 'Notice must be the final child of the parent text'
        self.assertIn('<strong>Ab 50 Teilnehmenden findet das Camp definitiv statt.</strong>', notice.group())
        self.assertIn('Erst wenn diese Mindestteilnehmerzahl erreicht ist, fallen für euch Kosten an.', notice.group())
        self.assertEqual(html.count('id="camp-minimum-note"'), 1)
        self.assertEqual(html.count('Ab 50 Teilnehmenden'), 1)
        info = re.search(r'<section[^>]*id="camp-infos".*?</section>', html, re.S)
        assert info is not None
        self.assertFalse('Mindestteilnehmerzahl' in info.group(), 'No duplicate notice in programme box')
        self.assertFalse('camp-minimum-title' in html, 'Old callout must not return')

    def test_sport2000_hint_removed_but_required_size_input_preserved(self):
        html = (ROOT / 'Camp2027.html').read_text()
        self.assertFalse('Sport2000' in html, 'Remove obsolete Sport2000 fitting sentence')
        inputs = [x for x in Inputs(html).inputs if x.get('id') == 'konfektionsgroesse']
        self.assertEqual(len(inputs), 1)
        self.assertEqual(inputs[0].get('name'), 'konfektionsgroesse')
        self.assertEqual(inputs[0].get('placeholder'), 'z. B. 128, 140 oder XS')
        self.assertIn('required', inputs[0])


if __name__ == '__main__':
    unittest.main()
