function getRand() {
    $('#status-sp').prop('hidden', false);
    $.ajax({
        statusCode: {
            500: function() {
                window.location.href = '/obweb';
            }
        },
        url: "/api/rand",
        crossDomain: true,
        type: 'GET',
        datatype: 'json',
        contentType: "Application/json",
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
        success: function(response) {
            console.log(response);
            $('#status-sp').prop('hidden', true);
            localStorage.setItem('page', response);
            //localStorage.setItem('file', )
            if (response != "no-page") {
                $('#page-content').html(renderMdToHtml(response));
            } else {
                $('#page-content').html("<h3>No Page</h3>")
            }
        },
        error: function(err) {
            $('#status-sp').prop('hidden', true);
            console.log(err);
            return err;
        }
    });
}

$(document).ready(function() {
    fetchPage('Unsort/todo.md');
});