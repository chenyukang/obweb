var date = new Date();

function padding(value, n) {
    return String(value).padStart(n, '0');
}

function dateStr(date) {
    return date.getFullYear() + "-" + padding(date.getMonth() + 1, 2) + "-" + padding(date.getDate(), 2);
}

function nextDaily() {
    date = new Date(date.setDate(date.getDate() + 1));
    getDaily(date);
}

function prevDaily() {
    date = new Date(date.setDate(date.getDate() - 1));
    getDaily(date);
}

function currentDaily() {
    getDaily(date);
}

function getDaily(date) {
    $('#status-sp').prop('hidden', false);
    var date_str = dateStr(date);
    $.ajax({
        statusCode: {
            500: function() {
                window.location.href = '/obweb';
            }
        },
        url: "/api/daily?date=" + date_str,
        crossDomain: true,
        type: 'GET',
        datatype: 'json',
        contentType: "Application/json",
        success: function(response) {
            $('#status-sp').prop('hidden', true);
            localStorage.setItem('page-content', response);
            localStorage.setItem('file', 'Daily/' + date_str + '.md');
            //console.log(date);
            if (response != "no-page") {
                header = "## " + date_str;
                if (response.indexOf(header) == -1) {
                    response = header + "\n\n---\n" + response;
                }
                $('#page-content').html(renderMdToHtml(response));
            } else {
                $('#page-content').html("<h3>No Page</h3>" + " " + date_str)
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
    getDaily(date);
});