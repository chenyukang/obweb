import path from 'path';
import fs from 'fs';
import chinaTime from 'china-time';
import { resolve } from 'path';
import config from 'config';
import {
    safeRead,
    gitPull,
    gitSync,
    gen_path
} from './utils.js';

import {
    ChatGPTAPI
} from 'chatgpt'


const SERV_PATH = resolve(config.get("serv_path"));
const OBPATH = resolve(path.join(SERV_PATH, config.get("ob_name")));
const CHATGPT_TOKEN = config.get("chatgpt_token");

import TelegramBot from 'node-telegram-bot-api';
const token = config.get("bot_token");

const bot = new TelegramBot(token, { polling: true });

var curCommand = "";

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "Welcome", {
        "reply_markup": {
            "keyboard": [
                ["/todo", "/write"],
                ["/read", "/chatG"],
            ]
        }
    });
});

async function chatGpt(msg, bot) {
    try {
        console.log("chatGpt: ", msg);
        const api = new ChatGPTAPI({ sessionToken: CHATGPT_TOKEN })
        await api.ensureAuth()
        const response = await api.sendMessage(msg.text)
        console.log(response)
        bot.sendMessage(msg.chat.id, response, { parse_mode: 'Markdown' });
    } catch (err) {
        console.log(err)
        bot.sendMessage(msg.chat.id, '😭出错了，我需要休息一下。');
    }
}


bot.on('message', (msg) => {
    console.log("received: ", msg);
    gitPull();
    let date_str = chinaTime('YYYY-MM-DD');
    let time_str = chinaTime('HH:mm');
    let body = {
        "text": msg.text || "",
        "images": msg.photo,
        "page": "",
    };
    let page = body['page']
    let path = gen_path(page, date_str);
    let data = safeRead(path, 'utf-8');

    if (page == "" && data.length == 0) {
        data = `## ${date_str}`;
    }
    console.log("curCommand: ", curCommand);
    let text = body['text'];
    if (text.length > 0 && text[0] == "/") {
        curCommand = text;
        gitPull();
        return;
    }

    if (curCommand == "/chatG") {
        chatGpt(msg, bot);
        return;
    }

    let content = page != "" ? `\n### ${date_str} ${time_str}` : `\n## ${time_str}`;
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
            // 250 is the maximize width show in Obsidian
            content += `\n![[${image_name}|250]]\n`;
            content = page == "todo" ? `${content}\n\n---\n\n${data}` : `${data}\n${content}`;
            fs.writeFileSync(path, content, 'utf-8');
            gitSync();
        });
    } else {
        content = page == "todo" ? `${content}\n\n---\n\n${data}` : `${data}\n${content}`;
        fs.writeFileSync(path, content, 'utf-8');
        gitSync();
    }
    bot.sendMessage(msg.chat.id, "Dear master, saved it!");
    curCommand = "";
});