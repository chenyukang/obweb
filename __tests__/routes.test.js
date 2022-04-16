//routes.test.js
const request = require('supertest');
const server = require('../server.js');

beforeAll(async() => {
    // do something before anything else runs
    console.log('Jest starting!');
});

// close the server after each test
afterAll(() => {
    server.close();
    console.log('server closed!');
});

describe('basic route tests', () => {
    test('get home route GET /', async() => {
        const response = await request(server).get('/');
        expect(response.status).toEqual(200);
        expect(response.text).toContain('Hello World!');
    });

    test('get page GET /api/page', async() => {
        const response = await request(server).get('/api/page?path=Unsort/todo');
        expect(response.status).toEqual(200);
        let res = response.text;
        expect(res).toContain("Unsort/todo");
    });

    test('get page invalid GET /api/page', async() => {
        const response = await request(server).get('/api/page?path=Unsort/todo_error');
        expect(response.status).toEqual(200);
        let res = response.text;
        expect(res).toContain("NoPage");
    });

    test('search GET /api/search', async() => {
        const response = await request(server).get('/api/search?keyword=todo');
        expect(response.status).toEqual(200);
        expect(response.text).toContain("Unsort/todo");
    });


    test('search failed GET /api/search', async() => {
        const response = await request(server).get('/api/search?keyword=undefxx');
        expect(response.status).toEqual(200);
        expect(response.text).toEqual("");
    });

    test('static image GET /static/images', async() => {
        const response = await request(server).get('/static/images/test.png');
        console.log(typeof(response.text));
        expect(response.status).toEqual(200);
        expect(response.text).toEqual(undefined);
        expect(response.type).toEqual('image/png');
    });

    test('static image GET /api/verify', async() => {
        const response = await request(server).get('/api/verify');
        console.log(typeof(response.text));
        expect(response.status).toEqual(200);
        expect(response.text).toEqual("ok");
    });


    test('post entry POST /api/entry', async() => {
        const response = await request(server).post('/api/entry').send({
            "page": "new_post",
            "links": "link1,link2",
            "image": "data:image/png;base64,image.....",
            "date": "2022-04-16T13:24:11.444Z",
            "text": "test text"
        });
        expect(response.status).toEqual(200);
        expect(response.text).toEqual("ok");
    });



});