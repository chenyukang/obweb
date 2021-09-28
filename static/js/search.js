function highlight(keyword) {
    var inputText = document.getElementById("search-content");
    var innerHTML = inputText.innerHTML;
    inputText.innerHTML = innerHTML.replaceAll(keyword, "<span class=\"highlight\">" + keyword + "</span>");
}

function search() {
    var input = $('#searchInput').val();
    //console.log(input);
    $('#status-sp').prop('hidden', false);
    $.ajax({
        url: "/api/search?keyword=" + input,
        crossDomain: true,
        type: 'GET',
        datatype: 'json',
        contentType: "Application/json",
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
        success: function(response) {
            //console.log(response);
            $('#status-sp').prop('hidden', true);
            if (response != "no-page") {
                var converter = new showdown.Converter(),
                    html = converter.makeHtml(response);
                $('#search-content').html(html);
                highlight(input);
            } else {
                $('#search-content').html("<h3>No Page</h3>" + " " + local_date)
            }
        },
        error: function(err) {
            $('#status-sp').prop('hidden', true);
            return err;
        }
    });
}

function fetchPage(e) {
    console.log(e);
    var url = e.target.innerText;
    var date = new Date();
    let begin_date = new Date(date.setDate(date.getDate() - 1000));
    $('#status-sp').prop('hidden', false);
    $.ajax({
        url: "/api/page/" + url,
        crossDomain: true,
        type: 'GET',
        datatype: 'json',
        contentType: "Application/json",
        headers: {
            "Access-Control-Allow-Origin": "*",
            "If-Modified-Since": begin_date.toISOString(),
        },
        success: function(response) {
            //console.log(response);
            $('#status-sp').prop('hidden', true);
            if (response != "no-page") {
                response = response.replaceAll("![[", "\n![img](/api/images/").replaceAll(" | #x-small]]", ")\n")
                var converter = new showdown.Converter(),
                    html = converter.makeHtml(response);
                $('#search-content').html(html);
                highlight($('#searchInput').val());
            } else {
                $('#search-content').html("<h3>No Page</h3>" + " " + local_date)
            }
        },
        error: function(err) {
            $('#status-sp').prop('hidden', true);
            return err;
        }
    });
}

$(document).ready(function() {
    $("body").on("click", "a", function(e) {
        // console.log("clicked");
        // e.preventDefault(); // Prevent a link from following the URL
        fetchPage(e);
    });

    var input = document.getElementById("searchInput");
    input.addEventListener("keyup", function(event) {
        if (event.keyCode === 13) {
            event.preventDefault();
            document.getElementById("searchBtn").click();
        }
    });
});