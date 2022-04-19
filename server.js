const Koa = require('koa');
const app = new Koa();
const router = require('koa-router')();
const serve = require('koa-static')
const mount = require('koa-mount')
const logger = require('koa-logger')
const path = require('path')
const fs = require('fs')
const json = require('koa-json');
const extname = path.extname;
const bodyParser = require('koa-bodyparser');
const chinaTime = require('china-time');
const { resolve } = require('path');
const basicAuth = require('koa-basic-auth');
const { readdir } = require('fs').promises;
var exec = require('child_process').exec;
const yaml = require('js-yaml');

const OBPATH = process.env.NODE_ENV == "test" ? resolve("./ob_test") : resolve("./ob")
const CONFPATH = process.env.NODE_ENV == "test" ? resolve("./__tests__/config.yml") : resolve("./.config.yml")
const DBPATH = process.env.NODE_ENV == "test" ? resolve("./__tests__/db") : resolve("./db");

function globalConfig() {
    if (fs.existsSync(CONFPATH)) {
        return yaml.load(fs.readFileSync(CONFPATH, 'utf-8'));
    } else {
        return {};
    }
}

function init() {
    let auth = globalConfig()['basicAuth'];
    if (auth) {
        app.use(basicAuth({
            name: auth['name'],
            pass: auth['pass']
        }));
    }
}

// logger
app.use(json());
app.use(logger());
app.use(bodyParser());

//app.use(basicAuth({ name: 'tj', pass: 'xxx' }));

app.use(async(ctx, next) => {
    if (!ctx.url.match(/^\/front/)) {
        await verify_login(ctx);
    }
    if (ctx.status != 401 || ctx.url == "/api/login") {
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
        const tokens = fs.readFileSync(DBPATH + "/tokens", 'utf-8');
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
    let conf = globalConfig();
    if (conf['basicAuth'] && conf['basicAuth']['name'] == username && conf['basicAuth']['pass'] == password) {
        let token_path = DBPATH + "/tokens";
        if (!fs.existsSync(token_path)) {
            fs.writeFileSync(token_path, "");
        }
        var crypto = require('crypto');
        let token = crypto.randomBytes(12).toString('hex');
        let content = fs.readFileSync(token_path, 'utf-8').split(/\r?\n/);
        content.push(token);
        while (content.length >= 7) {
            content.shift();
        }
        fs.writeFileSync(token_path, content.join("\n"));
        ctx.cookies.set('obweb', token, {
            maxAge: 1209600,
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

function stat(file) {
    return new Promise(function(resolve, reject) {
        fs.stat(file, function(err, stat) {
            if (err) {
                reject(err);
            } else {
                resolve(stat);
            }
        });
    });
}

function strip_ob(path) {
    return path.replace(OBPATH + "/", "");
}

function runShell(command) {
    if (process.env.NODE_ENV == "test") {
        return;
    }
    process.chdir(OBPATH);
    let dir = exec(command, function(err, stdout, stderr) {
        if (err) {
            console.log(err);
        }
        console.log(stdout);
    });

    dir.on('exit', function(code) {
        // exit code is code
        if (code != 0) {
            console.log("exit code is " + code);
        }
    });
}

function gitPull() {
    runShell("git pull");
}

function gitSync() {
    runShell("git add . && git commit -m \"update\" && git push");
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
    gitPull();
    const query = ctx.request.query;
    let date = query['path'];
    let page_path = path.join(OBPATH, `${date}.md`);
    if (fs.existsSync(page_path)) {
        let content = fs.readFileSync(page_path, 'utf-8');
        ctx.body = [strip_ob(page_path), content];
    } else {
        ctx.body = ["NoPage", ""];
    }
}

async function post_page(ctx) {
    const body = ctx.request.body;
    let fpath = body['file'];
    let page_path = path.join(OBPATH, `/${fpath}`);
    if (fs.existsSync(page_path)) {
        let content = body['content'];
        fs.writeFileSync(page_path, content);
        gitSync();
        ctx.status = 200;
    } else {
        ctx.body = ["NoPage", ""];
        ctx.status = 404;
    }
}


function get_or(value, def) {
    return (value === null || value === undefined) ? def : value;
}

async function get_image(ctx) {
    const fpath = path.join(OBPATH + "/Pics/", ctx.params.path);
    const fstat = await stat(fpath);
    if (fstat.isFile()) {
        ctx.type = extname(fpath);
        ctx.body = fs.createReadStream(fpath);
    }
}

async function search(ctx) {
    let query = ctx.request.query;
    let keyword = get_or(query['keyword'], "");
    let result = await getFiles(OBPATH)
        .then(files => {
            return files.filter(file => {
                let path = file.path;
                if (path.indexOf(".md") != -1) {
                    let content = fs.readFileSync(path, 'utf-8');
                    return (keyword.length == 0 || content.indexOf(keyword) != -1);
                }
                return false;
            });
        })
        .catch(e => console.error(e));
    let max_len = keyword.length == 0 ? 10 : result.length;
    result.sort((a, b) => b.time - a.time);
    result = result.slice(0, max_len);
    let res = result.map(f => {
        let path = strip_ob(f.path.replace(".md", ""));
        return `<li><a id=\"${path}\" href=\"#\">${path}</a></li>`;
    }).join("")
    ctx.body = res
}

function gen_path(page, date) {
    let path = page == "" ? `${OBPATH}/Daily/${date}.md` : `${OBPATH}/Unsort/${page}.md`;
    if (!fs.existsSync(path)) {
        fs.writeFileSync(path, "", 'utf-8');
    }
    return path;
}

async function post_entry(ctx) {
    let date_str = chinaTime('YYYY-MM-DD');
    let time_str = chinaTime('HH:mm');
    let body = ctx.request.body;
    let page = body['page']
    let path = gen_path(page, date_str);
    let data = fs.readFileSync(path, 'utf-8');

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
    gitSync();
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
    .get('/static/images/:path', get_image);

router.all('/obweb', ctx => {
    ctx.redirect('/front/index.html');
    ctx.status = 301;
});

app.use(mount('/front', serve(path.join(__dirname, 'front/public'))));
//app.use(mount('/static/images', serve(path.join(__dirname, 'ob/Pics'))));
app.use(router.routes())
    .use(router.allowedMethods());

const server = app.listen(8006);
module.exports = server;