"""External publication checks fail closed on inaccessible anonymous links."""
import importlib.util
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError, URLError
spec = importlib.util.spec_from_file_location('site_check', Path(__file__).with_name('check-site.py'))
site = importlib.util.module_from_spec(spec)
spec.loader.exec_module(site)

class ExternalLinks(unittest.TestCase):
    def test_success_uses_no_authorization(self):
        with patch.object(site, 'build_opener') as factory:
            response = factory.return_value.open.return_value.__enter__.return_value
            response.status, response.url = 200, 'https://example.com/evidence'
            self.assertIsNone(site.check_external(response.url))
            request = factory.return_value.open.call_args.args[0]
            self.assertNotIn('Authorization', dict(request.header_items()))
            self.assertNotIn('Cookie', dict(request.header_items()))

    def test_http_and_transport_errors_block(self):
        for error in [HTTPError('https://example.com',404,'Not Found',{},None), URLError('timeout')]:
            with self.subTest(error=error), patch.object(site, 'build_opener') as factory:
                factory.return_value.open.side_effect = error
                self.assertIsNotNone(site.check_external('https://example.com'))

    def test_private_redirect_blocks(self):
        with patch.object(site, 'build_opener') as factory:
            response = factory.return_value.open.return_value.__enter__.return_value
            response.status = 200
            response.url = 'https://github.com/ge-onu/infra-aiops-career-hub'
            self.assertIn('private', site.check_external('https://example.com'))

class Nesting(unittest.TestCase):
    """태그 짝이 어긋난 것을 잡는다.

    홈에 여는 <p> 없이 </p> 하나가 떠 있었다. 브라우저는 관대하게 넘어가고,
    링크와 프래그먼트만 보던 검사는 끝까지 통과했다. 그 뒤의 중첩이 통째로
    어긋나 있었는데 아무도 몰랐다.
    """

    def page(self, body):
        with tempfile.NamedTemporaryFile('w', suffix='.html', delete=False,
                                         encoding='utf-8') as f:
            f.write(f'<!doctype html><html><body>{body}</body></html>')
        return site.Page(Path(f.name)).errors

    def test_well_formed_passes(self):
        self.assertEqual(self.page('<div><p>글</p></div>'), [])

    def test_void_tags_need_no_closing(self):
        self.assertEqual(self.page('<div><img alt="" src="x.png"><br></div>'), [])

    def test_orphan_closing_tag_fails(self):
        # 홈에서 실제로 났던 모양이다 — <div class="ilimit">글</p></div>.
        # 여는 <p> 가 없으므로 </p> 가 <div> 를 닫으려 든다.
        errors = self.page('<div>글</p></div>')
        self.assertTrue(any('closed by </p>' in e for e in errors), errors)

    def test_mismatched_tag_fails(self):
        errors = self.page('<section><p>글</p></div>')
        self.assertTrue(any('closed by </div>' in e for e in errors), errors)

    def test_unclosed_tag_fails(self):
        errors = self.page('<div><p>글</p>')
        self.assertTrue(any('unclosed <div>' in e for e in errors), errors)


if __name__ == '__main__':
    unittest.main()
