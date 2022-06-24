const Koa = require('koa');
const path = require('path')
const fs = require('fs')
const chinaTime = require('china-time');
const { resolve } = require('path');
const config = require('config');
const Utils = require('./utils.js');

const SERV_PATH = resolve(config.get("serv_path"));
const OBPATH = resolve(path.join(SERV_PATH, config.get("ob_name")));

const TelegramBot = require('node-telegram-bot-api');
const token = config.get("bot_token");


const bot = new TelegramBot(token, { polling: true });

var curCommand = "";

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Welcome", {
        "reply_markup": {
            "keyboard": [
                ["/todo", "/write"],
                ["/read", "/share"],
            ]
        }
    });
});

bot.on('message', (msg) => {
    console.log("received: ", msg);
    Utils.gitPull();
    let date_str = chinaTime('YYYY-MM-DD');
    let time_str = chinaTime('HH:mm');
    let body = {
        "text": msg.text || "",
        "links": [],
        "images": msg.photo,
        "page": "",
    };
    let page = body['page']
    let path = Utils.gen_path(page, date_str);
    let data = Utils.safeRead(path, 'utf-8');

    if (page == "" && data.length == 0) {
        data = `## ${date_str}`;
    }
    let text = body['text'];
    if (text.length > 0 && text[0] == "/") {
        curCommand = text;
        Utils.gitPull();
        return;
    }
    let links = body['links'];
    let content = page != "" ? `\n### ${date_str} ${time_str}` : `\n## ${time_str}`;
    if (links.length > 0) {
        let link_str = links.split(",").map(l => `[[${l}]]`).join(" ");
        content += `\nLinks: ${link_str}`;
    }
    let append = text;
    if (curCommand == "/todo")
        append = `- [ ] ${text}`;
    else if (curCommand != "") {
        let tag = curCommand.substr(1);
        append = `- [ ] ${text}  #${tag}`;
    }
    content += `\n${append}`;
    let images = body['images'];
    if (images != undefined && images.length > 0) {
        var image = images[images.length - 1];
        var image_id = image['file_id'];
        bot.downloadFile(image_id, "/tmp/").then((filePath) => {
            console.log(filePath);
            var ext = filePath.split('.')[1];
            var image_name = `obweb-${chinaTime('YYYY-MM-DD-HH-mm-ss')}.${ext}`;
            var image_path = `${OBPATH}/Pics/${image_name}`;
            fs.renameSync(filePath, image_path);
            console.log(image_path);
            console.log(image_name);
            content += `\n![[${image_name}]]\n`;
            content = page == "todo" ? `${content}\n\n---\n\n${data}` : `${data}\n${content}`;
            fs.writeFileSync(path, content, 'utf-8');
            Utils.gitSync();
        });
    } else {
        content = page == "todo" ? `${content}\n\n---\n\n${data}` : `${data}\n${content}`;
        fs.writeFileSync(path, content, 'utf-8');
        Utils.gitSync();
    }
    bot.sendMessage(msg.chat.id, "Dear master, saved it!");
    curCommand = "";
});