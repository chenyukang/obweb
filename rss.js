const sqlite = require('better-sqlite3');
const fs = require('fs')
const { resolve } = require('path');
var request = require('request');
var HTMLParser = require('node-html-parser');
let RssParser = require('rss-parser');
var crypto = require('crypto');
const path = require('path')
const download = require('image-downloader');

let initdb_sql = `
CREATE TABLE IF NOT EXISTS pages(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title String NOT NULL,
    link String NOT NULL,
    website String,
    publish_datetime String,
    readed Boolean,
    source String NOT NULL)
`;

function rssDB(db_path) {
    const RSSDB = new sqlite(db_path);
    RSSDB.prepare(initdb_sql).run();
    //RSSDB.prepare(`CREATE UNIQUE INDEX idx_pages_link ON pages(link)`).run();
    return new sqlite(db_path);
}

function get_rss_page(link, db_path) {
    return rssDB(db_path).prepare(`SELECT * FROM pages WHERE link = ?`).all(link);
}

function gen_image_name(image_uri) {
    let image_dir = "./pages/images";
    if (!fs.existsSync(image_dir)) {
        fs.mkdir(dir, (err) => {
            if (err) {
                throw err;
            }
        });
    }
    let extname = image_uri.split('.').pop();
    let digest = crypto.createHash('sha256').update(image_uri)
        .digest('hex').substr(0, 15);
    return `${image_dir}/${digest}.${extname}`;
}


function downloadImage(url, filepath) {
    let fullpath = resolve(filepath);
    console.log("begin down load: ", url);
    let res = download.image({
        url,
        dest: fullpath
    }).then(file => {
        console.log("saved : ", fullpath);
    });
    return res;
}

function isValidHttpUrl(string) {
    let url;
    try {
        url = new URL(string);
    } catch (_) {
        return false;
    }

    return url.protocol === "http:" || url.protocol === "https:";
}

function preprocess_image(content, feed_url) {
    let url = (new URL(feed_url));
    let domain = url.hostname;
    let html = HTMLParser.parse(content);
    let res = html.toString();
    let imgs = html.querySelectorAll("img");
    imgs.forEach(img => {
        let attrs = img.attributes;
        let src = attrs['src'];
        let image_uri = isValidHttpUrl(src) ? src : `${url.protocol}//${domain}${src}`;
        let new_image_path = gen_image_name(image_uri);
        //if (!fs.existsSync(new_image_path)) {
        console.log("downloading image: ", image_uri);
        console.log("save: ", new_image_path);
        downloadImage(image_uri, new_image_path, () => {});
        //}
        if (fs.existsSync(new_image_path)) {
            let new_image = new_image_path.replace("./", "/");
            res = res.replace("src=\"" + src + "\"", "src=\"" + new_image + "\"");
        }
    })
    return res;
}

async function fetchFeed(feed_url, db_path) {
    let parser = new RssParser();
    let res = [];
    let feed = await parser.parseURL(feed_url);
    console.log(feed.title);
    feed.items.forEach(item => {
        //console.log(item.title + ':' + item.link)
        res.push(item);
        let pre = get_rss_page(item.link, db_path);
        if (pre.length == 0) {
            let res = rssDB(db_path).prepare(
                "INSERT INTO pages (title, link, website, publish_datetime, readed, source) values (?, ?, ?, ?, ?, ?)",
            ).run(item.title, item.link, item.link, item.pubDate, 0, feed_url);
            console.log(res);
            let page = get_rss_page(item.link, db_path)[0];
            let page_path = path.resolve(`./pages/${page.id}.html`);
            console.log(page_path);
            console.log("feed_url: ", feed_url);
            let content = preprocess_image(item.content, feed_url);
            fs.writeFileSync(page_path, content);
        }
    });
    return res;
}

async function fetchWithConf(feed_conf) {
    let feeds = fs.readFileSync(feed_conf).split(/\r?\n/);
    feeds.forEach(feed => {
        fetchFeed(feed);
    });
}

module.exports = {
    rssDB,
    fetchFeed,
    preprocess_image,
    gen_image_name,
    downloadImage,
}