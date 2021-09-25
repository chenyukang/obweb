
function getDaily(date) {
    var res = "";
    $.ajax({
        url: "/api/daily?date=" + date,
        crossDomain: true,
        type: 'GET',
        datatype: 'json',
        contentType: "Application/json",
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
        success: function (response) {
            //console.log(response);
            if (response != "no-page") {
                var converter = new showdown.Converter(),
                html      = converter.makeHtml(response);
                $('#daily').html(html);
            } else {
                $('#daily').html("<h2>No Daily</h2>" + " " + date);
            }            
        },
        error: function (err) {
            return err;
        }
    });
    console.log("res: {}", res);
    return res;
}

var date = new Date();

function nextDaily() {
    date = new Date(date.setDate(date.getDate() + 1));
    getDaily(date.toISOString());
}

function prevDaily() {
    date = new Date(date.setDate(date.getDate() - 1));
    getDaily(date.toISOString());
}


$(document).ready(function () {
    getDaily(date.toISOString());
});