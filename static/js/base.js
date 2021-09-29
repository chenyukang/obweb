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

function tryLogin() {
    var token = getCookie('token');
    if (token == null) {
        showLoginModal();
    } else {
        var data = JSON.stringify({
            token: token
        });
        $.ajax({
            url: "/api/verify",
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
                    $('#loginModal').modal('hide');
                } else {
                    showLoginModal();
                }
            },
            error: function(err) {
                console.log("There was an error saving the entry: ", err);
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

$(document).ready(function() {
    tryLogin();
    $('#loginBtn').on('click', function(event) {
        Login();
    });
});