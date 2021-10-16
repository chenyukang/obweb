function markDone(index) {
    $('#status-sp').prop('hidden', false);
    $.ajax({
        url: "/api/mark?index=" + index,
        type: 'POST',
        success: function(response) {
            console.log(response);
            if (response == "done") {
                fetchPage('Unsort/todo.md', adjustTodo);
            }
        },
        error: function(err) {
            console.log("Error: ", err);
        }
    });
}

function adjustTodo() {
    $('input:checkbox').each(function(index) {
        $(this).prop("id", index);
    })

    $("input:checkbox:not(:checked)").each(function() {
        var parent = $(this).parent();
        $(this).prop("disabled", false);
        parent.css("color", "red");
        parent.css("font-weight", "bold");
    });

    $('input:checkbox:not(:checked)').change(function() {
        console.log($(this));
        if ($(this).is(':checked')) {
            markDone($(this).prop("id"));
        }
    });
}

$(document).ready(function() {
    fetchPage('Unsort/todo.md', adjustTodo);
});