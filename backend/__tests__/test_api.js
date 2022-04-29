//test_api.test.js
const request = require('supertest');
const server = require('../server.js');
const AppDao = require('../dao.js');

beforeAll(async() => {
    // do something before anything else runs
    let res = await request(server).post('/api/login').send({
        username: 'admin',
        password: 'hello'
    });
    test_token = res['headers']['set-cookie'];
    sid = test_token[0].split(';')[0].split("=")[1];
    sid_sig = test_token[1].split(';')[0].split("=")[1];
    console.log('Jest starting!');
});

// close the server after each test
afterAll(done => {
    server.close();
    done();
    console.log('server closed!');
});

describe('basic route tests', () => {
    test('get home route GET /', async() => {
        const response = await request(server).get('/')
            .set('Cookie', [`koa.sid=${sid}; koa.sid.sig=${sid_sig}`]);
        expect(response.status).toEqual(200);
        expect(response.text).toContain('Hello World!');
    });

    test('Post /api/login', async() => {
        let res = await request(server).post('/api/login').send({
            username: 'admin',
            password: 'hello'
        });
        expect(res.status).toEqual(200);

        let res_error = await request(server).post('/api/login').send({
            username: 'admin',
            password: 'helloworld1234'
        });
        expect(res_error.status).toEqual(401);
    });

    test('get page GET /api/page', async() => {
        const response = await request(server).get('/api/page?path=Unsort/todo')
            .set('Cookie', [`koa.sid=${sid}; koa.sid.sig=${sid_sig}`]);
        expect(response.status).toEqual(200);
        let res = response.text;
        expect(res).toContain("Unsort/todo");
    });

    test('get page safe check GET /api/page', async() => {
        const response = await request(server).get('/api/page?path=Unsort/../../etc/passwd%00')
            .set('Cookie', [`koa.sid=${sid}; koa.sid.sig=${sid_sig}`]);
        expect(response.status).toEqual(200);
        expect(response.text).toContain("NoPage");
    });

    test('get page invalid GET /api/page', async() => {
        const response = await request(server).get('/api/page?path=Unsort/todo')
            .set('Cookie', [`koa.sid=${sid}_err; koa.sid.sig=${sid_sig}_err`]);
        expect(response.status).toEqual(401);
        let res = response.text;
        expect(res).toEqual("unauthorized");
    });

    test('get page invalid GET /api/page', async() => {
        const response = await request(server).get('/api/page?path=Unsort/todo_error')
            .set('Cookie', [`koa.sid=${sid}; koa.sid.sig=${sid_sig}`]);
        expect(response.status).toEqual(200);
        let res = response.text;
        expect(res).toContain("NoPage");
    });

    test('search GET /api/search', async() => {
        const response = await request(server).get('/api/search?keyword=todo')
            .set('Cookie', [`koa.sid=${sid}; koa.sid.sig=${sid_sig}`]);
        expect(response.status).toEqual(200);
        expect(response.text).toContain("Unsort/todo");
    });


    test('search failed GET /api/search', async() => {
        const response = await request(server).get('/api/search?keyword=undefxx')
            .set('Cookie', [`koa.sid=${sid}; koa.sid.sig=${sid_sig}`]);
        expect(response.status).toEqual(200);
        expect(response.text).toEqual("");
    });

    test('static image GET /static/images', async() => {
        const response = await request(server).get('/static/images/test.png')
            .set('Cookie', [`koa.sid=${sid}; koa.sid.sig=${sid_sig}`]);
        expect(response.status).toEqual(200);
        expect(response.text).toEqual("pig\n");
        expect(response.type).toEqual('text/plain');
    });


    test('static image right GET /static/images', async() => {
        const response = await request(server).get('/static/images/touxiang.png')
            .set('Cookie', [`koa.sid=${sid}; koa.sid.sig=${sid_sig}`]);
        expect(response.status).toEqual(200);
        expect(response.type).toEqual('text/plain');
    });

    test('login verify GET /api/verify', async() => {
        const response = await request(server).get('/api/verify')
            .set('Cookie', [`koa.sid=${sid}; koa.sid.sig=${sid_sig}`]);
        expect(response.status).toEqual(200);
        expect(response.text).toEqual("ok");
    });

    test('get rss GET /api/rss', async() => {
        let response = await request(server).get('/api/rss')
            .set('Cookie', [`koa.sid=${sid}; koa.sid.sig=${sid_sig}`]);
        expect(response.status).toEqual(200);
        expect(response.text).toContain("");

        AppDao.db().run(
            "INSERT INTO pages (title, link, website, publish_datetime, readed, source) values (?, ?, ?, ?, ?, ?)", ["title", "link", "link", Date.now(), 0, "http://google.com"]);
        response = await request(server).get('/api/rss')
            .set('Cookie', [`koa.sid=${sid}; koa.sid.sig=${sid_sig}`]);
        expect(response.status).toEqual(200);
        expect(response.text).toContain("");

    });

    test('post entry POST /api/entry', async() => {
        const response = await request(server).post('/api/entry').send({
                "page": "new_post",
                "links": "link1,link2",
                "image": "data:image/png;base64,image.....",
                "date": "2022-04-16T13:24:11.444Z",
                "text": "test text"
            })
            .set('Cookie', [`koa.sid=${sid}; koa.sid.sig=${sid_sig}`]);
        expect(response.status).toEqual(200);
        expect(response.text).toEqual("ok");
    });
});