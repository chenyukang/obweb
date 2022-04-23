const Koa = require('koa');
const app = new Koa();
const router = require('koa-router')();
const serve = require('koa-static')
const mount = require('koa-mount')
const logger = require('koa-logger')
const path = require('path')
const fs = require('fs')
const json = require('koa-json');
const bodyParser = require('koa-bodyparser');
const chinaTime = require('china-time');
const { resolve } = require('path');
const basicAuth = require('koa-basic-auth');
const { readdir } = require('fs').promises;
const yaml = require('js-yaml');
const escape = require('escape-path-with-spaces');
const config = require('config');
const AppDAO = require('./dao.js');
const Utils = require('./utils.js');


var crypto = require('crypto');

const OBPATH = resolve(config.get("ob"));
const DBPATH = resolve(config.get("db"));
const PORT = config.get("server.port");

function init() {
    let auth_user = config.get("basic_auth_user");
    if (auth_user) {
        app.use(basicAuth({
            name: auth_user,
            pass: config.get("basic_auth_pass")
        }));
    }
}

// logger
app.use(json());
app.use(logger());
app.use(bodyParser());

//app.use(basicAuth({ name: 'tj', pass: 'xxx' }));

app.use(async(ctx, next) => {
    let white_list = ["/api/login", "/obweb"];
    console.log("ctx url: ", ctx.url);
    if (!ctx.url.match(/^\/front/) && white_list.indexOf(ctx.url) == -1) {
        console.log("verify ...");
        await verify_login(ctx);
    }
    if (ctx.status != 401) {
        await next();
    }
});

// error handling
app.use(async(ctx, next) => {
    try {
        await next();
    } catch (err) {
        ctx.status = err.status || 500;
        ctx.body = err.message;
        ctx.app.emit('error', err, ctx);
    }
});

// response
async function verify_login(ctx) {
    let token = ctx.cookies.get('obweb');
    ctx.body = "unauthorized";
    ctx.status = 401;
    if (token != null && token != undefined) {
        const tokens = Utils.safeRead(DBPATH + "/tokens", 'utf-8');
        tokens.split(/\r?\n/).forEach(line => {
            if (line.trim() === token) {
                ctx.body = "ok";
                ctx.status = 200;
                return;
            }
        });
    }
}

async function user_login(ctx) {
    const body = ctx.request.body;
    let username = body['username'];
    let password = body['password'];
    let user = config.get("user");
    let pass = config.get("pass");
    if (user && pass && user == username && pass == password) {
        let token_path = DBPATH + "/tokens";
        if (!fs.existsSync(token_path)) {
            fs.writeFileSync(token_path, "");
        }
        let token = crypto.randomBytes(12).toString('hex');
        let content = Utils.safeRead(token_path, 'utf-8').split(/\r?\n/);
        content.push(token);
        while (content.length >= 7) {
            content.shift();
        }
        fs.writeFileSync(token_path, content.join("\n"));
        ctx.cookies.set('obweb', token, {
            expires: new Date(Date.now() + 1209600 * 1000),
            httpOnly: true,
            path: '/'
        });
        ctx.body = "ok";
        ctx.status = 200;
    } else {
        ctx.body = "failed";
        ctx.status = 401;
    }
}

async function getFiles(dir) {
    const dirents = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const path = resolve(dir, dirent.name);
        let obj = {
            path: path,
            time: fs.statSync(path).mtime.getTime()
        }
        return dirent.isDirectory() ? getFiles(path) : obj;
    }));
    return Array.prototype.concat(...files);
}

async function get_page(ctx) {
    Utils.gitPull();
    const query = ctx.request.query;
    let query_path = query['path'];
    let query_type = Utils.get_or(query['query_type'], "page");
    if (query_type === "rss") {
        const data = AppDAO.db()
            .get(`SELECT * FROM pages WHERE link = ? ORDER BY publish_datetime DESC LIMIT 1`, query_path);
        console.log(data);
        if (data.length > 0) {
            AppDAO.db().run(`UPDATE pages set readed = 1 where link = ?`, query_path);
            let title = data[0].title;
            let rss_path = path.join("./pages", escape(`${data[0].id}.html`));
            // TODO: Fix path error bug, path contains white space will trigger error
            let rss_page = Utils.safeRead(resolve(rss_path), 'utf-8');
            ctx.body = [title, rss_page, query_path, data[0].publish_datetime];
        } else {
            ctx.body = "NoPage";
        }
    } else {
        let page_path = path.join(OBPATH, `${query_path}.md`);
        console.log("get page_page: ", page_path);
        if (fs.existsSync(page_path)) {
            let content = Utils.safeRead(page_path, 'utf-8');
            ctx.body = [Utils.strip_ob(page_path), content];
        } else {
            ctx.body = ["NoPage", ""];
        }
    }
}

async function post_page(ctx) {
    const body = ctx.request.body;
    let fpath = body['file'];
    let page_path = path.join(OBPATH, `/${fpath}`);
    if (fs.existsSync(page_path)) {
        let content = body['content'];
        fs.writeFileSync(page_path, content);
        Utils.gitSync();
        ctx.status = 200;
    } else {
        ctx.body = ["NoPage", ""];
        ctx.status = 404;
    }
}

async function search(ctx) {
    let query = ctx.request.query;
    let keyword = Utils.get_or(query['keyword'], "");
    let result = await getFiles(OBPATH)
        .then(files => {
            return files.filter(file => {
                let path = file.path;
                if (path.indexOf(".md") != -1) {
                    let content = Utils.safeRead(path, 'utf-8');
                    return (keyword.length == 0 || content.indexOf(keyword) != -1);
                }
                return false;
            });
        })
        .catch(e => console.error(e));
    let max_len = keyword.length == 0 ? 20 : result.length;
    result.sort((a, b) => b.time - a.time);
    result = result.slice(0, max_len);
    let res = result.map(f => {
        let path = Utils.strip_ob(f.path.replace(".md", ""));
        return `<li><a id=\"${path}\" href=\"#\">${path}</a></li>`;
    }).join("")
    ctx.body = res
}

function get_rss(ctx) {
    let query = ctx.request.query;
    let read = query['query_type'] === "unread" ? 0 : 1;
    let limit = 30;
    const data =
        AppDAO.db().get(`SELECT * FROM pages WHERE readed = ? ORDER BY publish_datetime DESC LIMIT ?`, [read, limit]);
    let res = "";
    for (let i = 0; i < data.length; i++) {
        let item = data[i];
        let cl = item.readed ? "visited" : "";
        res += `<li><a class=\"${cl}\" id=\"${item.link}\", href=\"#\">${item.title}</a></li>`;
    }
    ctx.body = res;
}

async function post_entry(ctx) {
    let date_str = chinaTime('YYYY-MM-DD');
    let time_str = chinaTime('HH:mm');
    let body = ctx.request.body;
    let page = body['page']
    let path = Utils.gen_path(page, date_str);
    let data = Utils.safeRead(path, 'utf-8');

    if (page == "" && data.length == 0) {
        data = `## ${date_str}`;
    }
    let text = body['text'];
    let links = body['links'];
    let content = page != "" ? `\n### ${date_str} ${time_str}` : `\n## ${time_str}`;
    if (links.length > 0) {
        let link_str = links.split(",").map(l => `[[${l}]]`).join(" ");
        content += `\nLinks: ${link_str}`;
    }
    let append = page == "todo" ? `- [ ] ${text}` : text;
    content += `\n${append}`;
    let image = body['image'];
    if (image != "") {
        var ext = image.split(';')[0].match(/jpeg|png|gif/)[0];
        var image_data = image.replace(/^data:image\/\w+;base64,/, "");
        var buf = Buffer.from(image_data, 'base64');
        let image_name = `obweb-${chinaTime('YYYY-MM-DD-HH-mm-ss')}.${ext}`;
        let image_path = `${OBPATH}/Pics/${image_name}`;
        fs.writeFile(image_path, buf, { flag: 'w+' }, function(err) {});
        content += `\n\n![[${image_name} | #x-small]]\n`;
    }
    content = page == "todo" ? `${content}\n\n---\n\n${data}` : `${data}\n${content}`;
    fs.writeFileSync(path, content, 'utf-8');
    Utils.gitSync();
    ctx.body = "ok"
}

router.get('/', async(ctx, next) => {
        ctx.body = "Hello World!";
    })
    .get('/api/page', get_page)
    .post('/api/page', post_page)
    .get('/api/search', search)
    .post('/api/entry', post_entry)
    .get('/api/verify', verify_login)
    .post('/api/login', user_login)
    .get('/api/rss', get_rss);


router.all('/obweb', ctx => {
    ctx.redirect('/front/index.html');
    ctx.status = 301;
});

app.use(mount('/front', serve(path.join(__dirname, 'front/public'))));
app.use(mount('/pages/images/', serve(path.join(__dirname, 'pages/images'))));
app.use(mount('/static/images/', serve(`${OBPATH}/Pics`)));


app.use(router.routes())
    .use(router.allowedMethods());

const server = app.listen(PORT);
module.exports = server;