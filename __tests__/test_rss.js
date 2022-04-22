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
        await RSS.fetchFeed('http://catcoding.me/atom.xml', db_path);
    });
});