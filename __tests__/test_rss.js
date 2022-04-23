//test_api.test.js
const fs = require('fs')
const { resolve } = require('path');
const RSS = require('../rss.js');
const AppDao = require('../dao.js');
const db_path = resolve("./__tests__/rss.db");

describe('basic route tests', () => {

    beforeEach(function() {
        if (fs.existsSync(db_path)) {
            fs.unlinkSync(db_path);
        }
    });

    test('rss fetch and parse', async() => {
        expect(fs.existsSync(db_path)).toBe(false);
        AppDao.db();
        expect(fs.existsSync(db_path)).toBe(true);
        await RSS.fetchFeed('https://www.quastor.org/feed');
    });

    test('preprocess_image', async() => {
        let file = "./pages/images/8d274a6f8bfe9dd.png";
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
        }
        let html = '<ul id="list"><li>Hello World</li><img src="https://catcoding.me/css/images/logo.png" alt=""></ul>';
        let res = await RSS.preprocess_image(html, "https://catcoding.me/atom.xml");
        expect(res.indexOf(file.replace("./", "/"))).toBeGreaterThan(0);
    });

});