const sqlite = require('better-sqlite3');
const fs = require('fs')
const { resolve } = require('path');
var request = require('request');
var HTMLParser = require('node-html-parser');
let RssParser = require('rss-parser');
var crypto = require('crypto');
const path = require('path')
const download = require('image-downloader');
const AppDao = require('./dao.js');

function get_rss_page(link) {
    return AppDao.db().get(`SELECT * FROM pages WHERE link = ?`, link);
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
    let extname = image_uri.split('.').pop().split(/\#|\?/)[0];
    let digest = crypto.createHash('sha256').update(image_uri)
        .digest('hex').substr(0, 15);
    return `${image_dir}/${digest}.${extname}`;
}


function downloadImage(url, filepath) {
    let fullpath = resolve(filepath);
    console.log("begin down load: ", url, " to ", fullpath);
    try {
        let res = download.image({
            url,
            dest: fullpath
        }).then(file => {
            //console.log("saved : ", fullpath);
        });
    } catch (e) {
        console.log("download error: ", e);
    }
    return null;
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
        if (isValidHttpUrl(new_image_path) &&
            !fs.existsSync(new_image_path) && image_uri.length <= 100) {
            //console.log("downloading image: ", image_uri);
            //console.log("save: ", new_image_path);
            downloadImage(image_uri, new_image_path, () => {});
        }
        if (fs.existsSync(new_image_path)) {
            let new_image = new_image_path.replace("./", "/");
            res = res.replace("src=\"" + src + "\"", "src=\"" + new_image + "\"");
        }
    })
    return res;
}

async function fetchFeed(feed_url) {
    let parser = new RssParser();
    let res = [];
    let feed = await parser.parseURL(feed_url);
    console.log(feed.title);
    feed.items.forEach(item => {
        res.push(item);
        let pre = get_rss_page(item.link);
        if (pre.length == 0) {
            let sql = "INSERT INTO pages (title, link, website, publish_datetime, readed, source) values (?, ?, ?, ?, ?, ?)";
            AppDao.db().run(
                sql, [item.title, item.link, item.link, item.pubDate, 0, feed_url]);
            let page = get_rss_page(item.link)[0];
            let page_path = path.resolve(`./pages/${page.id}.html`);
            let content = preprocess_image(item.content, feed_url);
            fs.writeFileSync(page_path, content);
        }
    });
    return res;
}

async function updateRss(feed_conf) {
    let content = fs.readFileSync(feed_conf, 'utf-8');
    console.log(content);
    let feeds = content.split(/\r?\n/);

    for (let i = 0; i < feeds.length; i++) {
        let feed = feeds[i];
        console.log("process: %d %s", i, feed);
        try {
            console.log("fetching: ", feed);
            let res = await fetchFeed(feed);
        } catch (e) {
            console.log("error: ", e.backtrace);
        }
    }
}

module.exports = {
    fetchFeed,
    preprocess_image,
    gen_image_name,
    downloadImage,
    updateRss
}