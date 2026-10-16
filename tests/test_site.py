"""Browser smoke tests. Run: python3 -m unittest discover -s tests -v."""
import json
import threading
import unittest
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
REWRITES = json.loads((ROOT / 'vercel.json').read_text())['rewrites']

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = urlsplit(self.path)
        for rule in REWRITES:
            if path.path == rule['source']:
                self.path = rule['destination'] + ('?' + path.query if path.query else '')
                break
        try:
            super().do_GET()
        except (BrokenPipeError, ConnectionResetError):
            # A navigation can cancel an in-flight image response.
            pass

    def log_message(self, *_):
        pass

class WebsiteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}'
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width':1440,'height':1000}, reduced_motion='reduce')
        self.page = self.context.new_page()
        self.errors = []
        self.bad_responses = []
        self.page.on('pageerror', lambda error:self.errors.append(str(error)))
        self.page.on('response', lambda response:self.bad_responses.append((response.status,response.url)) if response.status>=400 else None)
        self.page.goto(self.base, wait_until='networkidle')

    def tearDown(self):
        self.assertEqual(self.errors, [], 'Uncaught browser exceptions')
        self.assertEqual(self.bad_responses, [], 'Failed HTTP requests')
        self.context.close()

    def test_default_and_direct_routes(self):
        self.assertEqual(self.page.locator('body').get_attribute('data-mode'),'agent')
        self.assertEqual(self.page.locator('.property-card').count(),3)
        for path,mode in [('/contractors','trade'),('/realtors','agent'),('/?for=contractors','trade'),('/?for=realtors','agent')]:
            self.page.goto(self.base+path,wait_until='networkidle')
            self.assertEqual(self.page.locator('body').get_attribute('data-mode'),mode)
        for path in ['/og.png','/styles.css','/app.js','/assets/hero-home.webp','/assets/symbols.woff']:
            with urlopen(self.base+path) as response:
                self.assertEqual(response.status,200)

    def test_filter_combinations_empty_state_and_reset(self):
        self.page.locator('[data-filter=mountain]').click()
        self.assertEqual(self.page.locator('.property-card').count(),2)
        self.page.locator('#priceFilter').select_option('1500000')
        self.assertEqual(self.page.locator('.property-card').count(),1)
        self.assertIn('Quiet Retreat',self.page.locator('.property-card').inner_text())
        self.page.locator('[data-filter=courtyard]').click()
        self.assertEqual(self.page.locator('.property-card').count(),0)
        self.assertTrue(self.page.locator('#propertyEmpty').is_visible())
        self.page.locator('#resetFilters').click()
        self.assertEqual(self.page.locator('.property-card').count(),3)
        self.assertFalse(self.page.locator('#propertyEmpty').is_visible())

    def test_saved_collection_persists_and_can_be_emptied(self):
        self.page.locator('[data-save=ridge]').click()
        self.assertEqual(self.page.locator('#savedCount').inner_text(),'1')
        self.page.reload(wait_until='networkidle')
        self.assertEqual(self.page.locator('[data-save=ridge]').get_attribute('aria-pressed'),'true')
        self.page.locator('#savedFilter').click()
        self.assertEqual(self.page.locator('.property-card').count(),1)
        self.page.locator('[data-save=ridge]').click()
        self.assertTrue(self.page.locator('#propertyEmpty').is_visible())
        self.assertEqual(self.page.evaluate('document.activeElement.id'),'savedFilter')

    def test_corrupt_local_storage_does_not_break_site(self):
        self.page.evaluate("localStorage.setItem('mwc-saved', '{broken')")
        self.page.reload(wait_until='networkidle')
        self.assertEqual(self.page.locator('.property-card').count(),3)
        self.assertEqual(self.page.locator('#savedCount').inner_text(),'0')
        self.page.evaluate("localStorage.setItem('mwc-saved', '{\"bad\":true}')")
        self.page.reload(wait_until='networkidle')
        self.assertEqual(self.page.locator('#savedCount').inner_text(),'0')

    def test_property_gallery_features_escape_and_focus(self):
        self.page.locator('[data-filter=courtyard]').click()
        self.page.locator('[data-open=courtyard]').click()
        self.assertTrue(self.page.locator('#propertyDialog').is_visible())
        self.assertEqual(self.page.locator('#dialogTitle').inner_text(),'The Courtyard')
        original=self.page.locator('#dialogImage').get_attribute('src')
        self.page.locator('#galleryNext').click()
        self.assertNotEqual(self.page.locator('#dialogImage').get_attribute('src'),original)
        self.assertIn('Design inspiration',self.page.locator('#galleryCount').inner_text())
        self.page.locator('[data-detail=outside]').click()
        self.assertIn('sculptural tree',self.page.locator('#featureDetail').inner_text())
        self.page.keyboard.press('Escape')
        self.assertFalse(self.page.locator('#propertyDialog').is_visible())
        self.assertEqual(self.page.evaluate('document.activeElement.dataset.open'),'courtyard')
        self.assertEqual(self.page.locator('.property-card').count(),1)

    def test_dialog_saved_filter_and_request_prefill(self):
        self.page.locator('[data-save=ridge]').click()
        self.page.locator('#savedFilter').click()
        self.page.locator('[data-open=ridge]').click()
        self.page.locator('#dialogSave').click()
        self.page.locator('#dialogClose').click()
        self.assertTrue(self.page.locator('#propertyEmpty').is_visible())
        self.page.locator('#resetFilters').click()
        self.page.locator('[data-open=ridge]').click()
        self.page.locator('#dialogCta').click()
        self.assertFalse(self.page.locator('#propertyDialog').is_visible())
        self.page.wait_for_function("document.activeElement.id === 'f-name'")
        self.assertIn('The Ridgeline',self.page.locator('#f-msg').input_value())

    def test_audience_switch_pricing_and_calculator(self):
        self.assertEqual(self.page.locator('#calcBig').inner_text(),'$16,000')
        self.page.locator('.audience-picker [data-set-mode=trade]').click()
        self.assertEqual(self.page.locator('body').get_attribute('data-mode'),'trade')
        self.assertTrue(self.page.locator('#tradeExperience').is_visible())
        self.assertFalse(self.page.locator('#propertyExperience').is_visible())
        self.assertIn('$2,500',self.page.locator('#pricingGrid').inner_text())
        self.assertIn('$149',self.page.locator('#pricingGrid').inner_text())
        self.assertEqual(self.page.locator('#calcBig').inner_text(),'$13,500')
        self.page.locator('#calcVal').fill('10000')
        self.assertEqual(self.page.locator('#calcBig').inner_text(),'$30,000')
        self.page.reload(wait_until='networkidle')
        self.assertEqual(self.page.locator('body').get_attribute('data-mode'),'trade')
        self.page.locator('#pricingSwitch').click()
        self.assertEqual(self.page.locator('body').get_attribute('data-mode'),'agent')
        self.assertIn('$2,000',self.page.locator('#pricingGrid').inner_text())
        self.assertEqual(self.page.locator('#calcBig').inner_text(),'$16,000')

    def test_project_comparison_pointer_keyboard_and_project_switch(self):
        self.page.locator('.audience-picker [data-set-mode=trade]').click()
        slider=self.page.locator('#comparisonRange')
        slider.focus()
        self.page.keyboard.press('ArrowRight')
        self.assertEqual(slider.input_value(),'51')
        self.assertIn('51 percent before',slider.get_attribute('aria-valuetext'))
        slider.fill('85')
        self.assertEqual(self.page.locator('#comparison').evaluate("el=>el.style.getPropertyValue('--split')"),'85%')
        slider.scroll_into_view_if_needed()
        box=slider.bounding_box()
        self.page.mouse.click(box['x']+box['width']*.25,box['y']+box['height']*.5)
        self.assertLess(int(slider.input_value()),40)
        self.page.locator('[data-project=landscape]').click()
        self.assertEqual(slider.input_value(),'50')
        self.assertIn('landscape.webp',self.page.locator('#comparisonAfter').evaluate('el=>getComputedStyle(el).backgroundImage'))
        self.assertIn('Unused space',self.page.locator('#projectTitle').inner_text())

    def test_request_validation_and_handoff_without_sending(self):
        self.page.locator('#leadForm button[type=submit]').click()
        self.assertEqual(self.page.locator('#f-name').get_attribute('aria-invalid'),'true')
        self.page.locator('#f-name').fill('Taylor & Co')
        self.page.locator('#f-phone').fill('123')
        self.page.locator('#leadForm button[type=submit]').click()
        self.assertEqual(self.page.locator('#f-phone').get_attribute('aria-invalid'),'true')
        self.page.locator('#f-phone').fill('385-555-0123')
        self.page.locator('#f-msg').fill('A gallery & project requests? Yes!')
        self.page.locator('#leadForm button[type=submit]').click()
        self.assertTrue(self.page.locator('#requestHandoff').is_visible())
        self.assertIn('not been sent',self.page.locator('#formStatus').inner_text())
        business=json.loads(self.page.locator('#businessData').text_content())
        self.assertTrue(self.page.locator('#requestEmail').is_visible())
        email=urlsplit(self.page.locator('#requestEmail').get_attribute('href'))
        self.assertEqual(email.path,'cash@muirwebco.com')
        self.assertEqual(email.path,business['email'])
        values=parse_qs(email.query)
        self.assertIn('Taylor & Co',values['subject'][0])
        self.assertIn('A gallery & project requests? Yes!',values['body'][0])
        self.assertEqual(self.page.locator('#requestSms').get_attribute('href'),'sms:+13854823995')
        self.context.grant_permissions(['clipboard-read','clipboard-write'])
        self.page.locator('#copyRequest').click()
        copied=self.page.evaluate('navigator.clipboard.readText()')
        self.assertIn('Taylor & Co',copied)
        self.assertIn('A gallery & project requests? Yes!',copied)
        self.assertIn('Nothing has been sent',self.page.locator('#formStatus').inner_text())
        self.page.locator('#f-msg').fill('Changed request')
        self.assertFalse(self.page.locator('#requestHandoff').is_visible())

    def test_specific_offer_and_client_proof_survive_audience_switching(self):
        headline=self.page.locator('#hero-title')
        self.assertIn('Websites for',headline.inner_text())
        self.assertIn('Utah realtors',headline.inner_text())
        proof=self.page.locator('.hero-proof')
        for text in ['Kyla Muir','Best of Utah Valley','2025','2026']:
            self.assertIn(text,proof.inner_text())
        self.assertEqual(proof.locator('a').get_attribute('href'),'https://kylamuirrealty.com')
        self.assertLess(proof.bounding_box()['y']+proof.bounding_box()['height'],1000)
        case=self.page.locator('.case-info').inner_text()
        for text in ['#1','Seven city pages','Santaquin','Payson','Salem','Spanish Fork','Springville','Mapleton','Orem','home-value funnel','home value report']:
            self.assertIn(text,case)
        self.page.locator('.audience-picker [data-set-mode=trade]').click()
        self.assertIn('Websites for',headline.inner_text())
        self.assertIn('Utah contractors',headline.inner_text())
        self.page.locator('.audience-picker [data-set-mode=agent]').click()
        self.assertIn('Kyla Muir',proof.inner_text())

    def test_mobile_call_and_text_controls_remain_visible_when_scrolling(self):
        for width in [320,390,650]:
            self.page.set_viewport_size({'width':width,'height':844})
            self.page.evaluate('scrollTo(0,0)')
            self.assertTrue(self.page.locator('.header-call').is_visible())
            self.assertEqual(self.page.locator('.header-call').get_attribute('href'),'tel:+13854823995')
            bar=self.page.locator('.mobile-contact')
            self.assertTrue(bar.is_visible())
            self.assertEqual(bar.evaluate('el=>getComputedStyle(el).position'),'fixed')
            self.assertEqual(bar.locator('[href^="tel:"]').get_attribute('href'),'tel:+13854823995')
            self.assertEqual(bar.locator('[href^="sms:"]').get_attribute('href'),'sms:+13854823995')
            self.page.evaluate('scrollTo(0,document.documentElement.scrollHeight)')
            box=bar.bounding_box()
            self.assertLessEqual(box['y']+box['height'],845)
            self.assertLessEqual(self.page.locator('.site-footer').bounding_box()['y']+self.page.locator('.site-footer').bounding_box()['height'],box['y'])

    def test_text_links_never_include_a_canned_message(self):
        for mode in ['agent','trade']:
            self.page.locator(f'.audience-picker [data-set-mode={mode}]').click()
            links=self.page.locator('a[href^="sms:"]').evaluate_all('links=>links.map(a=>a.getAttribute("href"))')
            self.assertGreaterEqual(len(links),5)
            self.assertTrue(all(link=='sms:+13854823995' for link in links),links)
        self.assertEqual(self.page.locator('[data-sms]').count(),0)

    def test_local_business_schema_matches_visible_contacts(self):
        business=json.loads(self.page.locator('script[type="application/ld+json"]').text_content())
        self.assertEqual(business['@context'],'https://schema.org')
        self.assertEqual(business['@type'],'ProfessionalService')
        self.assertEqual(business['name'],'Muir Web Co.')
        self.assertEqual(business['founder']['name'],'Cash Muir')
        self.assertEqual(business['areaServed']['name'],'Utah')
        self.assertEqual(business['address']['addressLocality'],'Clearfield')
        self.assertEqual(business['address']['addressRegion'],'UT')
        self.assertEqual(business['email'],'cash@muirwebco.com')
        phone=''.join(c for c in business['telephone'] if c.isdigit() or c=='+')
        calls=self.page.locator('a[href^="tel:"]').evaluate_all('links=>links.map(a=>a.getAttribute("href"))')
        self.assertTrue(all(link=='tel:'+phone for link in calls))
        self.assertNotIn('hello@muirwebco.com',self.page.content())
        if business.get('email'):
            contact=self.page.locator('[data-business-email]')
            self.assertTrue(contact.is_visible())
            self.assertEqual(contact.inner_text(),business['email'])
            self.assertEqual(contact.get_attribute('href'),'mailto:'+business['email'])

    def test_responsive_layout_and_reduced_motion(self):
        for width in [320,390,768,1024,1440]:
            self.page.set_viewport_size({'width':width,'height':900})
            for mode in ['agent','trade']:
                self.page.locator(f'.audience-picker [data-set-mode={mode}]').click()
                self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth'),f'Overflow at {width} in {mode}')
                self.assertFalse(self.page.locator('#hero-title').evaluate('el=>el.scrollWidth>el.clientWidth'),f'Clipped headline at {width} in {mode}')
        self.assertEqual(self.page.locator('#sceneCard').evaluate('el=>getComputedStyle(el).transform'),'none')
        self.page.locator('.audience-picker [data-set-mode=agent]').click()
        self.page.set_viewport_size({'width':390,'height':844})
        self.page.locator('[data-open=ridge]').click()
        self.assertFalse(self.page.locator('#propertyDialog').evaluate('el=>el.scrollWidth>el.clientWidth'))
        self.page.locator('#dialogClose').click()
        self.assertFalse(self.page.locator('#propertyDialog').is_visible())

if __name__=='__main__':
    unittest.main()
