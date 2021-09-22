var App = function(server) {
    this.server = server;
    this.entries = [];
};

App.prototype.login = function() {
    var data = JSON.stringify({
        username: $('#username').val(),
        password: $('#password').val(),
    });
    console.log(data);
    $.ajax({
        url: this.server + "api/login",
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
            console.log(response);
        },
        error: function(err) {
            console.log("There was an error saving the entry: ", err);
        }
    });
};

App.prototype.handleSubmit = function() {
    var elem = document.getElementById("upload-pic");
    var token = window.localStorage.getItem('token');
    if (token == null) {
        $('#loginModal').modal('show');
        return;
    }
    var data = JSON.stringify({
        date: new Date().toISOString(),
        tags: $('#tags').val(),
        links: $('#links').val(),
        page: $('#page').val(),
        text: $('textarea').val(),
        image: (elem.src.indexOf("data:image") === 0 ? elem.src : ""),
        token: token,
    });
    $('#status-sp').prop('hidden', false);
    console.log(data);
    $.ajax({
        url: this.server + "api/entry",
        crossDomain: true,
        type: 'POST',
        datatype: 'json',
        contentType: "Application/json",
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
        data: data,
        success: function(response) {
            console.log(response);
            $('#status-sp').prop('hidden', true);
            if (response == "ok") {
                $('#status-succ').prop('hidden', false);
            } else {
                $('#status-err').prop('hidden', false);
            }
        },
        error: function(err) {
            $('#status-sp').prop('hidden', true);
            $('#status-err').prop('hidden', false);
            console.log("There was an error saving the entry: ", err);
        }
    });
};

App.prototype.checkFormValidity = function() {
    return document.getElementById('journal-entry').checkValidity();
};

$(document).ready(function() {
    $('#login-btn').on('click', function(event) {
        app.login();
    });

    $('#submit-btn').on('click', function(event) {
        $("#submit-btn").prop('disabled', true);
        $("#status-succ").prop('hidden', true);
        $('#status-err').prop('hidden', true);

        event.preventDefault();
        app.handleSubmit();
    });

    $('textarea').on('input', function() {
        $("#submit-btn").prop('disabled', false);
    });

    $('#submit-btn').on('mouseover', function() {
        $("#submit-btn").prop('disabled', !app.checkFormValidity());
    });
});

var image;

function fileSelected(e) {
    const file = e.files[0];
    if (!file) {
        return;
    }

    if (!file.type.startsWith('image/')) {
        alert('Please select a image.');
        return;
    }

    const img = document.createElement('img-tag');
    img.file = file
    image = img;

    const reader = new FileReader();
    reader.onload = function(e) {
        var elem = document.getElementById("upload-pic");
        elem.src = e.target.result;
        elem.hidden = false;
    }
    reader.readAsDataURL(file);
}

function enableBtn() {
    $("#submit-btn").prop('disabled', false);
}

function clearAll() {
    $("#status-succ").prop('hidden', true);
    var elem = document.getElementById("upload-pic");
    elem.src = "";
    elem.hidden = true;
    $('textarea').val('');

    /* var tags = document.getElementById('tags');
    tags.value = "";

    var links = document.getElementById('links');
    links.value = ""; */
}



console.log("loaded");
var app = new App('http://23.100.38.125:8005/');