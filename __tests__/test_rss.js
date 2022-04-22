//test_api.test.js
const fs = require('fs')
const RSS = require('../rss.js');

const db_path = "/tmp/rss.db";


describe('basic route tests', () => {

    beforeEach(function() {
        if (fs.existsSync(db_path)) {
            fs.unlinkSync(db_path);
        }
    });

    test('rss db init', async() => {
        RSS.rssDB(db_path);
        expect(fs.existsSync(db_path)).toBe(true);
    });

    test('rss fetch and parse', async() => {
        await RSS.fetchFeed('https://catcoding.me/atom.xml', db_path);
    });

    test('preprocess_image', async() => {
        let html = '<ul id="list"><li>Hello World</li><img src="https://catcoding.me/images/ob_pasted-image-20220421211405.png" alt=""></ul>';
        let res = RSS.preprocess_image(html, "https://catcoding.me/atom.xml");
        expect(res.indexOf("/pages/images/e1230d579c19b86.png")).toBeGreaterThan(0);
    });

    test('download image', async() => {
        let image_uri = "https://catcoding.me/images/ob_pasted-image-20220421211405.png";
        let new_image_path = RSS.gen_image_name(image_uri);
        fs.unlinkSync(new_image_path, () => {});
        expect(new_image_path).toBe("./pages/images/e1230d579c19b86.png");
        expect(fs.existsSync(new_image_path)).toBe(false);
        await RSS.downloadImage(image_uri, new_image_path, () => {
            expect(fs.existsSync(new_image_path)).toBe(true);
        });
    });

});