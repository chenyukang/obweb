#!/usr/bin/env node

const RSS = require('./rss.js');
const config = require('config');

RSS.updateRss(config.get("feed_path"));