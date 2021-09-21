var App = function(server) {
    this.server = server;
    this.entries = [];
};

App.prototype.handleSubmit = function() {
    var content = {
        date: null,
        topic: null,
        text: null,
        image: null
    };

    content.date = new Date().toISOString();
    content.topic = $('#topic').val();
    content.text = $('textarea').val();
    var elem = document.getElementById("upload-pic");
    if (elem.src.indexOf("data:image") === 0) {
        content.image = elem.src;
    } else {
        content.image = "";
    }

    var data = JSON.stringify(content);
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
            $("#submit-btn").prop('disabled', false);
            console.log("finished ...");
        },
        error: function(err) {
            console.log("There was an error saving the entry: ", err);
        }
    });
};

App.prototype.checkFormValidity = function() {
    var form = document.getElementById('journal-entry');
    return form.checkValidity();
};

$(document).ready(function() {
    $('#submit-btn').on('click', function(event) {
        $("#submit-btn").prop('disabled', true);
        event.preventDefault();
        app.handleSubmit();
    });

    $('#submit-btn').on('mouseover', function() {
        if (app.checkFormValidity()) {
            console.log("valid");
            $("#submit-btn").prop('disabled', false);
        } else {
            console.log("invalid");
            $("#submit-btn").prop('disabled', true);
        }
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
    console.log("enable button...");
    $("#submit-btn").prop('disabled', false);
}

function clear() {
    var elem = document.getElementById("upload-pic");
    elem.src = "";
    elem.hidden = true;

    $('textarea').val('');
    var topic = document.getElementById('topic');
    console.log(topic.value);
    topic.value = "";
    console.log(topic.value);
}

console.log("loaded");
var app = new App('http://23.100.38.125:8005/');