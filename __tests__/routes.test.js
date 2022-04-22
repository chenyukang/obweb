//routes.test.js
const request = require('supertest');
const server = require('../server.js');
var test_token;

beforeAll(async() => {
    // do something before anything else runs
    let res = await request(server).post('/api/login').send({
        username: 'admin',
        password: 'helloworld123'
    });
    test_token = res['headers']['set-cookie'][0].split(';')[0].split("=")[1];
    console.log('Jest starting!');
});

// close the server after each test
afterAll(() => {
    server.close();
    console.log('server closed!');
});

describe('basic route tests', () => {
    test('get home route GET /', async() => {
        const response = await request(server).get('/')
            .set('Cookie', [`obweb=${test_token}`]);
        expect(response.status).toEqual(200);
        expect(response.text).toContain('Hello World!');
    });

    test('Post /api/login', async() => {
        let res = await request(server).post('/api/login').send({
            username: 'admin',
            password: 'helloworld123'
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
            .set('Cookie', [`obweb=${test_token}`]);
        expect(response.status).toEqual(200);
        let res = response.text;
        expect(res).toContain("Unsort/todo");
    });


    test('get page invalid GET /api/page', async() => {
        const response = await request(server).get('/api/page?path=Unsort/todo')
            .set('Cookie', [`obweb=${test_token}_ee`]);
        expect(response.status).toEqual(401);
        let res = response.text;
        expect(res).toEqual("unauthorized");
    });

    test('get page invalid GET /api/page', async() => {
        const response = await request(server).get('/api/page?path=Unsort/todo_error')
            .set('Cookie', [`obweb=${test_token}`]);
        expect(response.status).toEqual(200);
        let res = response.text;
        expect(res).toContain("NoPage");
    });

    test('search GET /api/search', async() => {
        const response = await request(server).get('/api/search?keyword=todo')
            .set('Cookie', [`obweb=${test_token}`]);
        expect(response.status).toEqual(200);
        expect(response.text).toContain("Unsort/todo");
    });


    test('search failed GET /api/search', async() => {
        const response = await request(server).get('/api/search?keyword=undefxx')
            .set('Cookie', [`obweb=${test_token}`]);
        expect(response.status).toEqual(200);
        expect(response.text).toEqual("");
    });

    test('static image GET /static/images', async() => {
        const response = await request(server).get('/static/images/test.png')
            .set('Cookie', [`obweb=${test_token}`]);
        expect(response.status).toEqual(200);
        expect(response.text).toEqual(undefined);
        expect(response.type).toEqual('image/png');
    });

    test('login verify GET /api/verify', async() => {
        const response = await request(server).get('/api/verify')
            .set('Cookie', [`obweb=${test_token}`]);
        expect(response.status).toEqual(200);
        expect(response.text).toEqual("ok");
    });

    test('get rss GET /api/rss', async() => {
        const response = await request(server).get('/api/rss')
            .set('Cookie', [`obweb=${test_token}`]);
        expect(response.status).toEqual(200);
        expect(response.text).toContain("<li>");
    });

    test('post entry POST /api/entry', async() => {
        const response = await request(server).post('/api/entry').send({
            "page": "new_post",
            "links": "link1,link2",
            "image": "data:image/png;base64,image.....",
            "date": "2022-04-16T13:24:11.444Z",
            "text": "test text"
        }).set('Cookie', [`obweb=${test_token}`]);
        expect(response.status).toEqual(200);
        expect(response.text).toEqual("ok");
    });



});