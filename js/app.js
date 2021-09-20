console.log("loading....xxx");

console.log("loaded");


var App = function(server){
    this.server = server;
    this.entries = [];
};

App.prototype.handleSubmit = function(){
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
    content.image = elem.src;

    var data = JSON.stringify(content);
    console.log(data);
    $.ajax({
      'url': this.server,
      'datatype': 'json',
      'type': 'POST',
      'data': data,
      'success': function(){
        app.appendEntry();
      },
      'error': function(err){
        console.log("There was an error saving the entry: ", err);
      }
    });
};

App.prototype.checkFormValidity = function(){
    var form = document.getElementById('journal-entry');
    return form.checkValidity();
  };
  
$(document).ready(function () {    
    $('#submit-btn').on('click', function (event) {
        event.preventDefault();
        app.handleSubmit();
    });

    $('div.submit-btn-container').on('mouseover', function () {
        console.log("mouseover");
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
    reader.onload = function (e) {
        var elem = document.getElementById("upload-pic");
        elem.src = e.target.result;
        elem.hidden = false;        
    }
    reader.readAsDataURL(file);
}

console.log("loaded");
var app = new App('http://127.0.0.1:8081/');

