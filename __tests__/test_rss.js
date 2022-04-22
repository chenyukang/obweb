//test_api.test.js
const fs = require('fs')
const RSS = require('../rss.js');


describe('basic route tests', () => {
    test('rss db init', async() => {
        let db_path = "/tmp/rss.db";
        RSS.initRssDB(db_path);
        expect(fs.existsSync(db_path)).toBe(true);
    });

    test('rss fetch and parse', () => {
        RSS.fetchFeed('http://catcoding.me/atom.xml');

    });
});