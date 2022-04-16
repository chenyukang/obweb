const Koa = require('koa');
const app = new Koa();
const router = require('koa-router')();
const serve = require('koa-static')
const mount = require('koa-mount')
const logger = require('koa-logger')
const path = require('path')
const fs = require('fs')
const json = require('koa-json');
const { resolve } = require('path');
const { readdir } = require('fs').promises;
const extname = path.extname;
const bodyParser = require('koa-bodyparser');
const chinaTime = require('china-time');

const OBPATH = resolve("./ob");

// logger
app.use(json());
app.use(logger());
app.use(bodyParser());

app.use(async(ctx, next) => {
    if (ctx.url.match(/^\/front/)) {
        //console.log("unprotected ...");
    } else {
        //console.log("protected checking ....");
    }
    await next();

});

// response
async function verify_login(ctx) {
    ctx.body = "ok";
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
    console.log(result);

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
    let content = "";

    if (page != "") {
        content += `\n### ${date_str} ${time_str}`;
    } else {
        content += `\n## ${time_str}`;
    }

    let links = body['links'];
    console.log("links: ", links);
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
        fs.writeFile(image_path, buf, { flag: 'w+' }, function(err) {
            console.log(err);
        });
        content += `\n\n![[${image_name} | #x-small]]\n`;
    }
    if (page == "todo") {
        content = `${content}\n\n---\n`;
        content += "\n${data}";
    } else {
        content = `${data}\n${content}`;
    }
    fs.writeFileSync(path, content, 'utf-8');
    //todo git sync
    ctx.body = "ok"
}

router.get('/api/page', get_page)
    .get('/api/search', search)
    .get('/static/images/:path', get_image)
    .post('/api/entry', post_entry)
    .get('/api/verify', verify_login);

router.all('/obweb', ctx => {
    ctx.redirect('/front/index.html');
    ctx.status = 301;
});

app.use(mount('/front', serve(path.join(__dirname, 'front/public'))));
//app.use(mount('/static/images', serve(path.join(__dirname, 'ob/Pics'))));
app.use(router.routes())
    .use(router.allowedMethods());

app.listen(8006);