function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function showLoginModal() {
    var modal = document.getElementById('loginModal');
    if (modal == null) {
        window.location.href = '/obweb';
    }
    $('#loginModal').modal('show');
}

// Try to verify token in cookie, 
// if it's not valid we need to show up login modal
function tryLogin() {
    var token = getCookie('token');
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
            crossDomain: true,
            type: 'GET',
            datatype: 'json',
            contentType: "Application/json",
            headers: {
                "Access-Control-Allow-Origin": "*",
            },
            success: function(response) {
                if (response != "failed") {
                    $('#loginModal').modal('hide');
                } else {
                    showLoginModal();
                }
            },
            error: function(err) {
                console.log("TryLogin error: ", err);
            }
        });
    }
}

function Login() {
    var data = JSON.stringify({
        username: $('#username').val(),
        password: $('#password').val(),
    });
    $.ajax({
        url: "/api/login",
        crossDomain: true,
        type: 'POST',
        datatype: 'json',
        contentType: "Application/json",
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
        data: data,
        success: function(response) {
            if (response != "failed") {
                var storage = window.localStorage;
                $('#loginModal').modal('hide');
            }
        },
        error: function(err) {
            console.log("There was an error when login: ", err);
        }
    });
};


function highlight(keyword) {
    var markInstance = new Mark(document.getElementById("page-content"));
    var options = {};
    markInstance.unmark({
        done: function() {
            markInstance.mark(keyword, options);
        }
    });
}

function fetchPage(url) {
    var date = new Date();
    let begin_date = new Date(date.setDate(date.getDate() - 1000));
    $('#status-sp').prop('hidden', false);
    $.ajax({
        url: "/api/page/" + url,
        crossDomain: true,
        type: 'GET',
        datatype: 'json',
        contentType: "Application/json",
        headers: {
            "Access-Control-Allow-Origin": "*",
            "If-Modified-Since": begin_date.toISOString(),
        },
        success: function(response) {
            //console.log(response);
            $('#status-sp').prop('hidden', true);
            if (response != "no-page") {
                localStorage.setItem('page-content', response);
                localStorage.setItem('file', url);

                var fileName = document.getElementById('fileName');
                if (fileName != null) {
                    fileName.innerText = url;
                }

                $('#page-content').html(renderMdToHtml(response));
                var keyword = $('#searchInput');
                if (keyword != null) {
                    highlight(keyword.val());
                }

                $('#pageNavBar').prop('hidden', false);
                $('#fileName').prop('hidden', false);
                $('#page-content').prop('hidden', false);
                hljs.highlightAll();
            } else {
                $('#page-content').html("<h3>No Page</h3>" + " " + local_date)
            }
        },
        error: function(err) {
            $('#status-sp').prop('hidden', true);
            return err;
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
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
        data: JSON.stringify({
            "file": file,
            "content": content
        }),
        success: function(response) {
            $('#status-sp').prop('hidden', true);
            localStorage.setItem('page-content', content);
            localStorage.setItem('file', file);
            $('#page-content').html(renderMdToHtml(content));
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
    var content = document.getElementById('page-content');
    content.setAttribute('contenteditable', 'false');
    content.style.backgroundColor = '#d8eaf0';

    var button = document.getElementById('editBtn');
    button.innerText = 'Edit';
    button.setAttribute('onclick', 'editPage()');
}

function savePage() {
    setSearchDefault();
    var content = document.getElementById('page-content');
    var text = content.innerText;
    var prev_content = localStorage.getItem('page-content');
    if (prev_content != text) {
        updatePage(localStorage.getItem('file'), text);
    } else {
        $('#page-content').html(renderMdToHtml(prev_content));
    }
}

function editPage() {
    var content = document.getElementById('page-content');
    content.innerText = localStorage.getItem('page-content');
    content.setAttribute('contenteditable', 'true');
    content.style.backgroundColor = 'yellow';
    var button = document.getElementById('editBtn');
    button.innerText = 'Save';
    button.setAttribute('onclick', 'savePage()');
}

function preprocessImage(response) {
    var result = ""
    var left = response;
    var last = 0;
    while (left.indexOf("![[") != -1) {
        var prev = left.substring(0, left.indexOf("![["));
        result += prev;
        var start = left.indexOf("![[") + 3;
        var end = left.indexOf("]]", start);
        var image = left.substring(start, end);
        var image_url = image.split("|")[0].trim();
        result += "![img](/static/images/" + image_url.replaceAll(' ', '%20') + ")";
        left = left.substring(end + 2);
        last = end + 2;
    }
    result += left;
    return result;
}

function preprocessLink(response) {
    var result = ""
    var left = response;
    var last = 0;
    while (left.indexOf("[[") != -1) {
        var prev = left.substring(0, left.indexOf("[["));
        result += prev;
        var start = left.indexOf("[[") + 2;
        var end = left.indexOf("]]", start);
        var link = left.substring(start, end).trim();
        left = left.substring(end + 2);
        if (prev.indexOf("```") != -1 && left.indexOf("```") != -1)
            result += link;
        else
            result += "[" + link + "]" + "(" + "/static/search.html?page=" + link.replaceAll(' ', '%20') + ")";
        last = end + 2;
    }
    result += left;
    return result;
}

function renderMdToHtml(response) {
    var result = preprocessImage(response);
    result = preprocessLink(result);
    var converter = new showdown.Converter();
    return converter.makeHtml(result);
}


$(document).ready(function() {
    $("body").on("click", "img", function(e) {
        var rato = $(this).width() / $(this).parent().width();
        if (rato <= 0.5) {
            $(this).css('width', '100%');
            $(this).css('height', '100%');
        } else {
            $(this).css('width', '50%');
            $(this).css('height', '50%');
        }
    });
});