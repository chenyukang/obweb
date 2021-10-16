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
            type: 'GET',
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

function fetchPage(url, callback = null) {
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
            "If-Modified-Since": begin_date.toISOString(),
        },
        success: function(response) {
            $('#status-sp').prop('hidden', true);
            if (response != "no-page") {
                localStorage.setItem('page-content', response);
                localStorage.setItem('file', url);

                var fileName = $('#fileName')[0];
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
    content.style.backgroundColor = 'white';

    var button = document.getElementById('editBtn');
    button.innerText = 'Edit';
    button.setAttribute('onclick', 'editPage()');
}

function savePage() {
    setSearchDefault();
    var text = document.getElementById('page-content').innerText.replace(/\u00a0/g, ' ');
    var prev_content = localStorage.getItem('page-content');
    if (prev_content != text) {
        updatePage(localStorage.getItem('file'), text);
    } else {
        $('#page-content').html(renderMdToHtml(prev_content));
    }
}

function editPage() {
    var content = document.getElementById('page-content');
    content.innerText = localStorage.getItem('page-content').replace(/ /g, '\u00a0');;
    console.log(localStorage.getItem('page-content'));
    content.setAttribute('contenteditable', 'true');
    content.style.backgroundColor = '#fffcc0';
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
        result += "![img](/static/images/" + encodeURI(image_url) + ")";
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
            result += "[" + link + "]" + "(" + "/static/search.html?page=" + encodeURI(link) + ")";
        last = end + 2;
    }
    result += left;
    return result;
}

function renderMdToHtml(response) {
    var result = preprocessImage(response);
    result = preprocessLink(result);
    var converter = new showdown.Converter({ simpleLineBreaks: true, tasklists: true });
    return converter.makeHtml(result);
}


$(document).ready(function() {

    $("body").on("click", "img", function(e) {
        var rato = $(this).width() / $(this).parent().width();
        console.log(rato);
        if (rato <= 0.6) {
            $(this).css('width', '100%');
            $(this).css('height', '100%');
        } else {
            $(this).css('width', '50%');
            //$(this).css('height', '50%');
        }
    });
});