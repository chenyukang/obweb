var App = function() {
    this.entries = [];
};

function showSuccMsg() {
    $('#status-sp').prop('hidden', true);
    $('#status-msg').removeClass("alert-danger");
    $('#status-msg').addClass("alert-success");
    $('#status-msg').html("保存成功");
    $('#status-msg').prop('hidden', false);
}

function showErrMsg() {
    $('#status-sp').prop('hidden', true);
    $('#status-msg').removeClass("alert-success");
    $('#status-msg').addClass("alert-danger");
    $('#status-msg').html("保存失败");
    $('#status-msg').prop('hidden', false);
}

App.prototype.handleSubmit = function() {
    var elem = document.getElementById("upload-pic");
    var data = JSON.stringify({
        date: new Date().toISOString(),
        links: $('#links').val(),
        page: $('#page').val(),
        text: $('#content').val(),
        image: (elem.src.indexOf("data:image") === 0 ? elem.src : ""),
    });
    //console.log(data);
    $.ajax({
        url: "/api/entry",
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
    $('#status-msg').prop('hidden', true);
    $("#upload-pic").prop('hidden', true);
    $('#status-sp').prop('hidden', true);
    $("#upload-pic").prop('src', "")
    window.localStorage.removeItem("content");
    window.localStorage.removeItem("links");
    window.localStorage.removeItem("page");
    $('#content').val('');
}

var app = new App();

$(document).ready(function() {
    tryLogin();

    $('#loginBtn').on('click', function() {
        Login();
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

    $('#content').on('change', function() {
        window.localStorage.setItem("content", $('#content').val());
    });

    $('#submit-btn').on('mouseover', function() {
        $("#submit-btn").prop('disabled', !app.checkFormValidity());
    });

    $('#links').on('change', function() {
        window.localStorage.setItem("links", $('#links').val());
    });

    $('#page').on('change', function() {
        window.localStorage.setItem("page", $('#page').val());
    });

    if (window.localStorage.getItem("content") != null) {
        $('#content').val(window.localStorage.getItem("content"));
    }

    var links = window.localStorage.getItem("links");
    if (links != null) {
        links.split(",").forEach(function(link) {
            $('#links').tagsinput('add', link);
        });
    };

    var page = window.localStorage.getItem("page");
    if (page != null) {
        $('#page').tagsinput('add', page);
    };

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
});