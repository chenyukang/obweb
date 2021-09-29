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


function updatePage(file, content) {
    $('#status-sp').prop('hidden', false);
    $.ajax({
        url: "/api/update",
        crossDomain: true,
        type: 'PUT',
        datatype: 'json',
        contentType: "Application/json",
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
        data: {
            "file": file,
            "content": content
        },
        success: function(response) {
            console.log(response);
            $('#status-sp').prop('hidden', true);
            localStorage.setItem('page', content);
        },
        error: function(err) {
            $('#status-sp').prop('hidden', true);
            console.log(err);
            return err;
        }
    });
}


function getDaily(date) {
    $('#status-sp').prop('hidden', false);
    var date_str = dateStr(date);
    $.ajax({
        url: "/api/daily?date=" + date_str,
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
            //console.log(date);
            console.log(date_str)
            if (response != "no-page") {
                header = "## " + date_str;
                if (response.indexOf(heaader) == -1) {
                    response = header + "\n\n---\n" + response;
                }
                response = response.replaceAll("![[", "\n![img](/static/images/").replaceAll(" | #x-small]]", ")\n")
                var converter = new showdown.Converter(),
                    html = converter.makeHtml(response);
                $('#daily-content').html(html);
            } else {
                $('#daily-content').html("<h3>No Page</h3>" + " " + date_str)
            }
        },
        error: function(err) {
            $('#status-sp').prop('hidden', true);
            console.log(err);
            return err;
        }
    });
}

function savePage() {
    console.log("saving now ...");
    var content = document.getElementById('daily-content');
    var text = content.innerText;
    var button = document.getElementById('editBtn');
    button.innerText = 'Edit';
    button.setAttribute('onclick', 'editPage()');
    content.setAttribute('contenteditable', 'false');
    content.style.backgroundColor = '#d8eaf0';
    updatePage("Daily/" + dateStr(date), text);
}

function editPage() {
    var content = document.getElementById('daily-content');
    content.innerText = localStorage.getItem('page');
    content.setAttribute('contenteditable', 'true');
    content.style.backgroundColor = 'yellow';
    var button = document.getElementById('editBtn');
    button.innerText = 'Save';
    button.setAttribute('onclick', 'savePage()');
}

$(document).ready(function() {
    getDaily(date);
});