function convertTZ(date, tzString) {
    return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", { timeZone: tzString }));
}

function getDaily(date) {
    var res = "";
    $('#status-daily-sp').prop('hidden', false);
    $.ajax({
        url: "/api/daily?date=" + date.toISOString(),
        crossDomain: true,
        type: 'GET',
        datatype: 'json',
        contentType: "Application/json",
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
        success: function(response) {
            //console.log(response);
            $('#status-daily-sp').prop('hidden', true);
            var local_date = convertTZ(date, 'Asia/Shanghai').toISOString().substr(0, 10);
            if (response != "no-page") {
                header = "## " + local_date;
                if (response.indexOf(header) == -1) {
                    response = header + "\n\n---\n" + response;
                }
                response = response.replaceAll("![[", "\n![img](/api/images/").replaceAll(" | #x-small]]", ")\n")
                var converter = new showdown.Converter(),
                    html = converter.makeHtml(response);
                $('#daily-content').html(html);
            } else {
                $('#daily-content').html("<h3>No Page</h3>" + " " + local_date)
            }
        },
        error: function(err) {
            $('#status-daily-sp').prop('hidden', true);
            return err;
        }
    });
    console.log("res: {}", res);
    return res;
}

var date = new Date();

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

$(document).ready(function() {
    getDaily(date);
});