function markDone(index) {
    $('#status-sp').prop('hidden', false);
    $.ajax({
        url: "/api/mark?index=" + index,
        type: 'POST',
        success: function(response) {
            if (response == "done") {
                fetchPage('Unsort/todo.md', adjustTodo);
            }
        },
        error: function(err) {
            console.log("Error: ", err);
        }
    });
}



$(document).ready(function() {
    fetchPage('Unsort/todo.md', adjustTodo);
});