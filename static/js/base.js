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
    console.log("please login");
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
                storage.setItem('token', response);
                $('#loginModal').modal('hide');
            }
        },
        error: function(err) {
            console.log("There was an error saving the entry: ", err);
        }
    });
};

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
            console.log(response);
            $('#status-sp').prop('hidden', true);
            localStorage.setItem('page', content);
            response = content.replaceAll("![[", "\n![img](/static/images/").replaceAll(" | #x-small]]", ")\n")
            var converter = new showdown.Converter(),
                html = converter.makeHtml(response);
            $('#page-content').html(html);
        },
        error: function(err) {
            $('#status-sp').prop('hidden', true);
            console.log(err);
            return err;
        }
    });
}

function savePage() {
    console.log("saving now ...");
    var content = document.getElementById('page-content');
    var text = content.innerText;
    var button = document.getElementById('editBtn');
    button.innerText = 'Edit';
    button.setAttribute('onclick', 'editPage()');
    content.setAttribute('contenteditable', 'false');
    content.style.backgroundColor = '#d8eaf0';
    updatePage("Daily/" + dateStr(date) + ".md", text);
}

function editPage() {
    var content = document.getElementById('page-content');
    content.innerText = localStorage.getItem('page');
    content.setAttribute('contenteditable', 'true');
    content.style.backgroundColor = 'yellow';
    var button = document.getElementById('editBtn');
    button.innerText = 'Save';
    button.setAttribute('onclick', 'savePage()');
}

function renderMdToHtml(response) {
    response = response.replaceAll("![[", "\n![img](/static/images/").replaceAll(" | #x-small]]", ")\n")
    var converter = new showdown.Converter();
    return converter.makeHtml(response);
}