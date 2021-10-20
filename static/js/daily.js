let date = new Date();

function padding(value, n) {
    return String(value).padStart(n, '0');
}

function dateStr(date) {
    return date.getFullYear() + "-" + padding(date.getMonth() + 1, 2) + "-" + padding(date.getDate(), 2);
}

function nextDaily() {
    date = new Date(date.setDate(date.getDate() + 1));
    getDaily(date);
}

function prevDaily() {
    date = new Date(date.setDate(date.getDate() - 1));
    getDaily(date);
}

function currentDaily() {
    getDaily(date);
}

function getDaily(date) {
    let date_str = dateStr(date);
    fetchPage(`Daily/${date_str}.md`);
}

$(document).ready(function() {
    getDaily(date);
});