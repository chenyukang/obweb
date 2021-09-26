function convertTZ(date, tzString) {
    return new Date((typeof date === "string" ? new Date(date) : date).toLocaleString("en-US", { timeZone: tzString }));
}

function padding(value, n) {
    return String(value).padStart(n, '0');
}

function getLocaleDateString() {
    const formats = {
        "zh-CN": "yyyy/MM/dd",
        "en": "YY/MM/dd",
        "zu-ZA": "yyyy/MM/dd",
    };

    return formats[navigator.language] || "yyyy/MM/dd";
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
            //console.log(date);
            var lang = window.navigator.userLanguage || window.navigator.language;
            var date = new Date();
            var options = {
                year: "numeric",
                month: "2-digit",
                day: "numeric"
            };

            var local_date = date.toLocaleDateString(lang, options);
            var elems = date.toLocaleDateString().split("/");
            var local_date = elems[2] + "-" + padding(elems[0], 2) + "-" + padding(elems[1], 2);
            console.log(local_date);
            if (response != "no-page") {
                //header = "## " + local_date;
                /* if (response.indexOf(header) == -1) {
                    response = header + "\n\n---\n" + response;
                } */
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