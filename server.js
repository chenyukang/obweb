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


const OBPATH = resolve("./ob");

// logger
app.use(json());
app.use(logger());

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
    console.log(page_path);
    if (fs.existsSync(page_path)) {
        let content = fs.readFileSync(page_path, 'utf-8');
        ctx.body = [page_path, content];
    } else {
        ctx.body = ["NoPage", ""];
    }
}

function get_or(value, def) {
    return (value === null || value === undefined) ? def : value;
}

async function get_image(ctx) {
    console.log("get_image: ", ctx.params.path);
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
    console.log(typeof(keyword));
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
    console.log(result);
    let max_len = keyword.length == 0 ? 10 : result.length;
    result.sort((a, b) => b.time - a.time);
    result = result.slice(0, max_len);
    console.log(result);

    let res = result.map(f => {
        let path = f.path.replace(".md", "").replace(OBPATH + "/", "");
        return `<li><a id=\"${path}\" href=\"#\">${path}</a></li>`;
    }).join("")
    console.log("finished");
    ctx.body = res
}


router.get('/api/page', get_page)
    .get('/api/search', search)
    .get('/static/images/:path', get_image)
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