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
      text: null
    };
  
    content.date = new Date().toISOString();
    console.log("date: ", content.date);
    content.topic = $('#topic').val();
    content.text = $('textarea').val();
    
    var data = $("#journal-entry").serialize();
    $.ajax({
      'url': '/entry',
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

console.log("loaded");
var app = new App('http://127.0.0.1:8081/');

