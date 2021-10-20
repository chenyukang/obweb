"use strict";

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function showLoginModal() {
    if ($('#loginModal').length == 0) {
        window.location.href = '/obweb';
    }
    $('#loginModal').modal('show');
}

// Initialize the agent at application startup.
const fpPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.onload = resolve
        script.onerror = () => reject('Failed to load the script')
        script.async = true
        script.src = 'https://cdn.jsdelivr.net/npm/' +
            '@fingerprintjs/fingerprintjs@3/dist/fp.min.js'
        document.head.appendChild(script)
    })
    .then(() => FingerprintJS.load())

var fingerToken;

fpPromise
    .then(fp => fp.get())
    .then(result => {
        // This is the visitor identifier:
        console.log(result);
        const visitorId = result.visitorId
        console.log(visitorId)
        fingerToken = visitorId;
    })
    .catch(error => console.error(error));


// Try to verify token in cookie, 
// if it's not valid we need to show up login modal
function tryLogin(callback = null) {
    let token = getCookie('token');
    if (token == null) {
        showLoginModal();
    } else {
        $.ajax({
            statusCode: {
                500: function() {
                    showLoginModal();
                }
            },
            url: "/api/verify",
            type: 'GET',
            success: function(response) {
                if (response != "failed") {
                    $('#loginModal').modal('hide');
                } else {
                    showLoginModal();
                }
                if (callback != null) {
                    callback();
                }
            },
            error: function(err) {
                console.log("TryLogin error: ", err);
            }
        });
    }
}

function Login() {
    let data = JSON.stringify({
        username: $('#username').val(),
        password: $('#password').val(),
        finger: fingerToken
    });
    $.ajax({
        url: "/api/login",
        crossDomain: true,
        type: 'POST',
        datatype: 'json',
        contentType: "Application/json",
        data: data,
        success: function(response) {
            if (response != "failed") {
                let storage = window.localStorage;
                $('#loginModal').modal('hide');
            }
        },
        error: function(err) {
            console.log("There was an error when login: ", err);
        }
    });
};

function fetchPage(url, callback = null) {
    let date = new Date();
    let begin_date = new Date(date.setDate(date.getDate() - 1000));
    $('#status-sp').prop('hidden', false);
    $.ajax({
        url: "/api/page/" + url,
        crossDomain: true,
        type: 'GET',
        datatype: 'json',
        contentType: "Application/json",
        headers: {
            "If-Modified-Since": begin_date.toISOString(),
        },
        success: function(response) {
            $('#status-sp').prop('hidden', true);
            if (response != "no-page") {
                localStorage.setItem('page-content', response);
                localStorage.setItem('file', url);

                let fileName = $('#fileName')[0];
                if (fileName != null) {
                    $(fileName).text(url);
                }

                $('#page-content').html(renderMdToHtml(response));
                hljs.highlightAll();

                $('#pageNavBar').prop('hidden', false);
                $('#fileName').prop('hidden', false);
                $('#page-content').prop('hidden', false);
                if (callback != null) {
                    callback();
                }
            } else {
                $('#page-content').html("<h3>No Page</h3>")
            }
        },
        error: function(err) {
            $('#status-sp').prop('hidden', true);
            return err;
        }
    });
}

function adjustTodo() {
    $('input:checkbox').each(function(index) {
        $(this).prop("id", index);
    })

    $("input:checkbox:not(:checked)").each(function() {
        let parent = $(this).parent();
        $(this).prop("disabled", false);
        parent.css("color", "red");
        parent.css("font-weight", "bold");
    });

    $('input:checkbox:not(:checked)').change(function() {
        if ($(this).is(':checked')) {
            markDone($(this).prop("id"));
        }
    });
}

function updatePage(file, content) {
    $('#status-sp').prop('hidden', false);
    $.ajax({
        url: "/api/page",
        crossDomain: true,
        type: 'POST',
        datatype: 'json',
        contentType: "Application/json",
        data: JSON.stringify({
            "file": file,
            "content": content
        }),
        success: function(response) {
            $('#status-sp').prop('hidden', true);
            localStorage.setItem('page-content', content);
            localStorage.setItem('file', file);
            $('#page-content').html(renderMdToHtml(content));
            adjustTodo();
        },
        error: function(err) {
            $('#status-sp').prop('hidden', true);
            console.log(err);
            return err;
        }
    });
}

function setSearchDefault() {
    $('#pageNavbar').prop('hidden', true);
    $('#fileName').prop('hidden', true);
    $('#page-content').prop('contenteditable', false);
    $('#page-content').css('backgroundColor', 'white');

    $('#editBtn').text('Edit');
    $('#editBtn').attr('onclick', 'editPage()');
}

function savePage() {
    setSearchDefault();
    let text = document.getElementById('page-content').innerText.replace(/\u00a0/g, ' ');
    let prev_content = localStorage.getItem('page-content');
    if (prev_content != text) {
        updatePage(localStorage.getItem('file'), text);
    } else {
        $('#page-content').html(renderMdToHtml(prev_content));
    }
}

function editPage() {
    let content = document.getElementById('page-content');
    content.innerText = localStorage.getItem('page-content').replace(/ /g, '\u00a0');;
    $('#page-content').prop('contenteditable', true);
    $('#page-content').css('backgroundColor', '#fffcc0');
    $('#editBtn').text('Save');
    $('#editBtn').attr('onclick', 'savePage()');
}

function preprocessImage(response) {
    let result = ""
    let left = response;
    let last = 0;
    while (left.indexOf("![[") != -1) {
        let prev = left.substring(0, left.indexOf("![["));
        result += prev;
        let start = left.indexOf("![[") + 3;
        let end = left.indexOf("]]", start);
        let image = left.substring(start, end);
        let image_url = image.split("|")[0].trim();
        result += "![img](/static/images/" + encodeURI(image_url) + ")";
        left = left.substring(end + 2);
        last = end + 2;
    }
    result += left;
    return result;
}

function preprocessLink(response) {
    let result = ""
    let left = response;
    let last = 0;
    while (left.indexOf("[[") != -1) {
        let prev = left.substring(0, left.indexOf("[["));
        result += prev;
        let start = left.indexOf("[[") + 2;
        let end = left.indexOf("]]", start);
        let link = left.substring(start, end);
        left = left.substring(end + 2);
        if (prev.indexOf("```") != -1 && left.indexOf("```") != -1)
            result += "[[" + link + "]]";
        else
            result += "[" + link.trim() + "]" + "(" + "/static/search.html?page=" + encodeURI(link.trim()) + ")";
        last = end + 2;
    }
    result += left;
    return result;
}

function renderMdToHtml(response) {
    let result = preprocessImage(response);
    result = preprocessLink(result);
    let converter = new showdown.Converter({
        simpleLineBreaks: true,
        tasklists: true,
        headerLevelStart: 2,
        simplifiedAutoLink: true,
        strikethrough: true,
        emoji: true
    });
    converter.setFlavor('github');
    return converter.makeHtml(result);
}

$(document).ready(function() {
    $("body").on("click", "img", function(e) {
        let rato = $(this).width() / $(this).parent().width();
        if (rato <= 0.6) {
            $(this).css('width', '100%');
            $(this).css('height', '100%');
        } else {
            $(this).css('width', '50%');
            //$(this).css('height', '50%');
        }
    });
});