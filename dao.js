const sqlite = require('better-sqlite3');
const { resolve } = require('path');
const config = require('config');
const RSSDBPATH = resolve(config.get("rssdb"));

let instance = null;

class AppDAO {
    constructor(dbFilePath = "") {
        this.db = new sqlite(dbFilePath || RSSDBPATH);
        console.log("debug db: ", this.db);
        this.db.prepare(`CREATE TABLE IF NOT EXISTS pages(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title String NOT NULL,
            link String NOT NULL,
            website String,
            publish_datetime String,
            readed Boolean,
            source String NOT NULL)`).run();
    }

    static db() {
        if (!instance) {
            instance = new AppDAO();
        }
        return instance;
    }

    get(sql, params) {
        return this.db.prepare(sql).all(params);
    }

    run(sql, params) {
        return this.db.prepare(sql).run(params);
    }
}

module.exports = AppDAO