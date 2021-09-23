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

function showSuccMsg() {
    $('#status-sp').prop('hidden', true);
    $('#status-msg').addClass("alert-success");
    $('#status-msg').html("保存成功");
    $('#status-msg').prop('hidden', false);
}

function showErrMsg() {
    $('#status-sp').prop('hidden', true);
    $('#status-msg').addClass("alert-danger");
    $('#status-msg').html("保存失败");
    $('#status-msg').prop('hidden', false);
}

function tryLogin() {
    var token = window.localStorage.getItem('token');
    if (token == null) {
        $('#loginModal').modal('show');
        return true;
    }
    return false;
}

App.prototype.handleSubmit = function() {
    var elem = document.getElementById("upload-pic");
    if (tryLogin()) {
        return true;
    }
    var data = JSON.stringify({
        date: new Date().toISOString(),
        tags: $('#tags').val(),
        links: $('#links').val(),
        page: $('#page').val(),
        text: $('#content').val(),
        image: (elem.src.indexOf("data:image") === 0 ? elem.src : ""),
        token: window.localStorage.getItem('token')
    });
    //console.log(data);
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
            if (response == "ok") {
                showSuccMsg();
            } else {
                showErrMsg();
            }
        },
        error: function(err) {
            showErrMsg();
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
        $("#status-msg").prop('hidden', true);
        $('#status-sp').prop('hidden', false);
        event.preventDefault();
        app.handleSubmit();
    });

    $('#content').on('input', function() {
        $("#submit-btn").prop('disabled', false);
    });

    $('#submit-btn').on('mouseover', function() {
        $("#submit-btn").prop('disabled', !app.checkFormValidity());
    });

    document.getElementById('content').onpaste = function(event) {
        var items = (event.clipboardData || event.originalEvent.clipboardData).items;
        JSON.stringify(items);
        // will give you the mime types
        // find pasted image among pasted items
        var blob = null;
        for (var i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") === 0) {
                blob = items[i].getAsFile();
                break;
            }
        }
        // load image if there is a pasted image
        if (blob !== null) {
            var reader = new FileReader();
            reader.onload = function(e) {
                console.log(event.target.result); // data url!
                $("#upload-pic").prop("src", e.target.result);
                $("#upload-pic").prop("hidden", false);
            };
            reader.readAsDataURL(blob);
        }
    }

    tryLogin();
});

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

    const reader = new FileReader();
    reader.onload = function(e) {
        $("#upload-pic").prop("src", e.target.result);
        $("#upload-pic").prop("hidden", false);
    }
    reader.readAsDataURL(file);
}

function enableBtn() {
    $("#submit-btn").prop('disabled', false);
}

function clearAll() {
    $('#status-succ').prop('hidden', true);
    $("#upload-pic").prop('hidden', true);
    $('#status-sp').prop('hidden', true);
    $("#upload-pic").prop('src', "")
    $('#content').val('');
}



console.log("loaded");
var app = new App('http://23.100.38.125:8005/');