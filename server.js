const Koa = require('koa');
const app = new Koa();
const router = require('koa-router')();
const serve = require('koa-static')
const mount = require('koa-mount')
const path = require('path')
const fs = require('fs')
const json = require('koa-json');

// logger
app.use(json());

app.use(async(ctx, next) => {
    if (ctx.url.match(/^\/front/)) {
        console.log("unprotected ...");
    } else {
        console.log("protected checking ....");
    }
    await next();

});

// response
async function verify_login(ctx) {
    ctx.body = "ok";
}

async function get_page(ctx) {
    console.log(ctx.url);
    const query = ctx.request.query;
    let date = query['path'];
    let page_path = path.join("./ob/", `${date}.md`);
    console.log(page_path);
    if (fs.existsSync(page_path)) {
        let content = fs.readFileSync(page_path, 'utf-8');
        ctx.body = [page_path, content];
    } else {
        ctx.body = ["NoPage", ""];
    }
}

router.get('/api/page', get_page)
    .get('/api/verify', verify_login);

router.all('/obweb', ctx => {
    ctx.redirect('/front/index.html');
    ctx.status = 301;
});

app.use(mount('/front', serve(path.join(__dirname, 'front/public'))))
app.use(router.routes())
    .use(router.allowedMethods());

app.listen(3000);