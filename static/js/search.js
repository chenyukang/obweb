function search() {
    setSearchDefault();
    let input = $('#searchInput').val();
    $('#status-sp').prop('hidden', false);
    $.ajax({
        url: "/api/search?keyword=" + input,
        crossDomain: true,
        type: 'GET',
        datatype: 'json',
        contentType: "Application/json",
        success: function(response) {
            $('#status-sp').prop('hidden', true);
            if (response != "no-page") {
                $('#page-content').html(renderMdToHtml(response));
                $('#pageNavBar').prop('hidden', true);
                $('#page-content').prop('hidden', false);
            } else {
                $('#page-content').html("<h3>No Page</h3>" + " " + local_date)
            }
        },
        error: function(err) {
            $('#status-sp').prop('hidden', true);
            return err;
        }
    });
}

function highlight(keyword) {
    let markInstance = new Mark($("#page-content").get(0));
    let options = {};
    if (keyword != "" && keyword != undefined) {
        markInstance.unmark({
            done: function() {
                markInstance.mark(keyword, options);
            }
        });
    }
}

function highlightResult() {
    let keyword = $('#searchInput');
    if (keyword != null) {
        highlight(keyword.val());
    }
}

function searchParams() {
    let urlParams;
    (window.onpopstate = function() {
        let match,
            pl = /\+/g, // Regex for replacing addition symbol with a space
            search = /([^&=]+)=?([^&]*)/g,
            decode = function(s) { return decodeURIComponent(s.replace(pl, " ")); },
            query = window.location.search.substring(1);

        urlParams = {};
        while (match = search.exec(query))
            urlParams[decode(match[1])] = decode(match[2]);
    })();
    return urlParams;
}


$(document).ready(function() {
    $(".pageContent").on("click", "a", function(e) {
        let url = e.target.innerText;
        if (url.endsWith(".md")) {
            fetchPage(url, highlightResult);
        }
    });

    $('#searchInput').on('keyup', function(event) {
        if (event.keyCode == 13) {
            search();
        }
    });

    let keyword = searchParams()["page"];
    if ($('#searchInput').val() == "" && keyword != undefined) {
        document.getElementById("searchInput").value = keyword;
    }

    tryLogin(search);
});