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
                $('#page-content').html(renderMdToHtml(response));
                $('#editBtn').prop('hidden', true);
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


function updatePage(file, content) {
    $('#status-sp').prop('hidden', false);
    $.ajax({
        url: "/api/page",
        crossDomain: true,
        type: 'POST',
        datatype: 'json',
        contentType: "Application/json",
        headers: {
            "Access-Control-Allow-Origin": "*",
        },
        data: JSON.stringify({
            "file": file,
            "content": content
        }),
        success: function(response) {
            console.log(response);
            $('#status-sp').prop('hidden', true);
            localStorage.setItem('page', content);
            $('#page-content').html(renderMdToHtml(response));
            $('#page-content').prop('hidden', false);
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
    var content = document.getElementById('page-content');
    var text = content.innerText;
    var button = document.getElementById('editBtn');
    button.innerText = 'Edit';
    button.setAttribute('onclick', 'editPage()');
    content.setAttribute('contenteditable', 'false');
    content.style.backgroundColor = '#d8eaf0';
    updatePage(localStorage.getItem('file'), text);
}

function editPage() {
    var content = document.getElementById('page-content');
    content.innerText = localStorage.getItem('page');
    content.setAttribute('contenteditable', 'true');
    content.style.backgroundColor = 'yellow';
    var button = document.getElementById('editBtn');
    button.innerText = 'Save';
    button.setAttribute('onclick', 'savePage()');
}

$(document).ready(function() {
    tryLogin();
    $("body").on("click", "a", function(e) {
        fetchPage(e.target.innerText);
    });

    var input = document.getElementById("searchInput");
    input.addEventListener("keyup", function(event) {
        if (event.keyCode === 13) {
            event.preventDefault();
            document.getElementById("searchBtn").click();
        }
    });
});