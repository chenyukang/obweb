<script>
    import { onMount } from "svelte";
    const jq = window.$;

    export let cur_page;
    export let cur_time;
    let date = new Date();
    let file = "";
    let content = "";
    let show_status = false;
    let show_search_nav = false;
    let search_input = "";
    let in_edit = false;

    export const refresh = (cur) => {
        //cur_page = cur
        console.log("refresh ...", cur_page);
        if (cur_page == "day") {
            getDaily(date);
        } else if (cur_page == "rand") {
            fetchPage("", true);
        } else if (cur_page == "todo") {
            fetchPage("Unsort/todo.md", false, adjustTodo);
        } else if (cur_page == "find") {
            searchInit();
            search();
        }
    };

    $: {
        if (cur_page) {
            console.log(cur_time);
            refresh(cur_page);
        }
    }

    function padding(value, n) {
        return String(value).padStart(n, "0");
    }

    function dateStr(date) {
        return (
            date.getFullYear() +
            "-" +
            padding(date.getMonth() + 1, 2) +
            "-" +
            padding(date.getDate(), 2)
        );
    }

    function nextDaily() {
        date = new Date(date.setDate(date.getDate() + 1));
        getDaily(date);
    }

    function prevDaily() {
        date = new Date(date.setDate(date.getDate() - 1));
        getDaily(date);
    }

    function getDaily(date) {
        let date_str = dateStr(date);
        fetchPage(`Daily/${date_str}.md`);
    }
    function preprocessImage(response) {
        let result = "";
        let left = response;
        let last = 0;
        while (left.indexOf("![[") != -1) {
            let prev = left.substring(0, left.indexOf("![["));
            result += prev;
            let start = left.indexOf("![[") + 3;
            let end = left.indexOf("]]", start);
            let image = left.substring(start, end);
            let image_url = image.split("|")[0].trim();
            result += "![img](/static/images/" + encodeURI(image_url) + ")";
            left = left.substring(end + 2);
            last = end + 2;
        }
        result += left;
        return result;
    }

    function markDone(index) {
        show_status = true;
        jq.ajax({
            url: "/api/mark?index=" + index,
            type: "POST",
            success: function (response) {
                if (response == "done") {
                    fetchPage("Unsort/todo.md", adjustTodo);
                }
            },
            error: function (err) {
                console.log("Error: ", err);
            },
        });
    }

    function adjustTodo() {
        jq("input:checkbox").each(function (index) {
            jq(this).prop("id", index);
        });

        jq("input:checkbox:not(:checked)").each(function () {
            let parent = jq(this).parent();
            jq(this).prop("disabled", false);
            parent.css("color", "red");
            parent.css("font-weight", "bold");
        });

        jq("input:checkbox:not(:checked)").change(function () {
            if (jq(this).is(":checked")) {
                markDone(jq(this).prop("id"));
            }
        });
    }

    function preprocessLink(response) {
        let result = "";
        let left = response;
        let last = 0;
        while (left.indexOf("[[") != -1) {
            let prev = left.substring(0, left.indexOf("[["));
            result += prev;
            let start = left.indexOf("[[") + 2;
            let end = left.indexOf("]]", start);
            let link = left.substring(start, end);
            left = left.substring(end + 2);
            if (prev.indexOf("```") != -1 && left.indexOf("```") != -1)
                result += "[[" + link + "]]";
            else
                result +=
                    "[" +
                    link.trim() +
                    "]" +
                    "(" +
                    "/static/search.html?page=" +
                    encodeURI(link.trim()) +
                    ")";
            last = end + 2;
        }
        result += left;
        return result;
    }

    function renderMdToHtml(response) {
        let result = preprocessImage(response);
        result = preprocessLink(result);
        let converter = new showdown.Converter({
            simpleLineBreaks: true,
            tasklists: true,
            headerLevelStart: 2,
            simplifiedAutoLink: true,
            strikethrough: true,
            emoji: true,
        });
        converter.setFlavor("github");
        return converter.makeHtml(result);
    }

    function updatePage(file, content) {
        show_status = true;
        jq.ajax({
            url: "/api/page",
            type: "POST",
            datatype: "json",
            contentType: "Application/json",
            data: JSON.stringify({
                file: file,
                content: content,
            }),
            success: function (response) {
                show_status = false;
                localStorage.setItem("page-content", content);
                localStorage.setItem("file", file);
                jq("#page-content").html(renderMdToHtml(content));
                setSearchDefault();
                adjustTodo();
            },
            error: function (err) {
                show_status = false;
                console.log(err);
                return err;
            },
        });
    }

    function fetchPage(url, rand_query = false, callback = null) {
        let date = new Date();
        let begin_date = new Date(date.setDate(date.getDate() - 1000));
        show_status = true;
        jq.ajax({
            url: `/api/page?path=${url}&rand=${rand_query}`,
            type: "GET",
            datatype: "json",
            contentType: "Application/json",
            headers: {
                // Important since warp will cache the unmodified files
                "If-Modified-Since": begin_date.toISOString(),
            },
            statusCode: {
                400: function () {
                    showLoginModal();
                },
            },
            success: function (response) {
                show_status = false;
                show_search_nav = true;
                file = response[0];
                content = response[1];
                if (file != "NoPage") {
                    localStorage.setItem("page-content", content);
                    localStorage.setItem("file", file);
                    jq(fileName).text(file);
                    jq("#page-content").html(renderMdToHtml(content));
                    hljs.highlightAll();

                    if (callback != null) {
                        callback();
                    }
                } else {
                    jq("#page-content").html("<h3>No Page</h3>");
                    jq(fileName).text(url);
                }
            },
            error: function (err) {
                show_status = false;
                return err;
            },
        });
    }

    function searchInit() {
        jq(".pageContent").on("click", "a", function (e) {
            let url = e.target.innerText;
            if (url.endsWith(".md")) {
                fetchPage(url, false, highlightResult);
            }
        });

        jq("#searchInput").on("keyup", function (event) {
            if (event.keyCode == 13) {
                search();
            }
        });

        let keyword = searchParams()["page"];
        if (jq("#searchInput").val() == "" && keyword != undefined) {
            document.getElementById("searchInput").value = keyword;
        }

        search_input = "";
    }

    function setSearchDefault() {
        jq("#page-content").prop("contenteditable", false);
        jq("#page-content").css("backgroundColor", "white");

        jq("#editBtn").text("Edit");
        in_edit = false;
    }

    function savePage() {
        let text = document
            .getElementById("page-content")
            .innerText.replace(/\u00a0/g, " ");
        let prev_content = localStorage.getItem("page-content");
        if (prev_content != text) {
            updatePage(localStorage.getItem("file"), text);
        } else {
            setSearchDefault();
            jq("#page-content").html(renderMdToHtml(prev_content));
        }
    }

    function editPage() {
        if (in_edit) {
            savePage();
        } else {
            let content = document.getElementById("page-content");
            content.innerText = localStorage
                .getItem("page-content")
                .replace(/ /g, "\u00a0");
            jq("#page-content").prop("contenteditable", true);
            jq("#page-content").css("backgroundColor", "#fffcc0");
            jq("#editBtn").text("Save");
            in_edit = true;
        }
    }

    function search() {
        setSearchDefault();
        show_status = true;
        jq.ajax({
            url: "/api/search?keyword=" + search_input,
            type: "GET",
            datatype: "json",
            contentType: "Application/json",
            success: function (response) {
                show_status = false;
                if (response != "no-page") {
                    jq("#page-content").html(renderMdToHtml(response));
                    show_search_nav = false;
                    jq("#page-content").prop("hidden", false);
                    searchInit();
                } else {
                    jq("#page-content").html(
                        "<h3>No Page</h3>" + " " + local_date
                    );
                }
            },
            error: function (err) {
                show_status = false;
                return err;
            },
        });
    }

    function highlight(keyword) {
        let markInstance = new Mark(jq("#page-content").get(0));
        let options = {};
        if (keyword != "" && keyword != undefined) {
            markInstance.unmark({
                done: function () {
                    markInstance.mark(keyword, options);
                },
            });
        }
    }

    function highlightResult() {
        if(search_input != "") {
            highlight(search_input);
        }
    }

    function searchParams() {
        let urlParams;
        (window.onpopstate = function () {
            let match,
                pl = /\+/g, // Regex for replacing addition symbol with a space
                search = /([^&=]+)=?([^&]*)/g,
                decode = function (s) {
                    return decodeURIComponent(s.replace(pl, " "));
                },
                query = window.location.search.substring(1);

            urlParams = {};
            while ((match = search.exec(query)))
                urlParams[decode(match[1])] = decode(match[2]);
        })();
        return urlParams;
    }

    onMount(async () => {
        //refresh("day");
        searchInit();
    });
</script>

<div class="tab-content">
    {#if cur_page == "day"}
        <div class="row card sticky-top" style="margin-top: 20px; border: 0;">
            <div class="col-md-10 text-right">
                <button
                    type="button"
                    class="btn btn-info"
                    style="float: left"
                    on:click={prevDaily}>Prev</button
                >
                <button
                    type="button"
                    class="btn btn-warning"
                    style="float: center"
                    id="editBtn"
                    on:click={editPage}>Edit</button
                >
                <button type="button" class="btn btn-info" on:click={nextDaily}
                    >Next</button
                >
            </div>
        </div>
        {#if show_status}
            <div class="row">
                <div class="col-md-2" />
                <div class="col-md-6" id="status-sp">
                    <div class="text-center">
                        <div class="spinner-border text-success" role="status">
                            <span class="sr-only">Sending</span>
                        </div>
                    </div>
                </div>
            </div>
        {/if}
        <div class="row">
            <div class="col-md-2" />
            <div class="col-md-6">
                <div class="text-center" style="margin-top: 20px;">
                    <h4>
                        <span class="badge badge-secondary" id="fileName" />
                    </h4>
                </div>
            </div>
            <div class="col-md-2" />
        </div>
        <div class="row">
            <div class="col-md-10">
                <div class="pageContent" id="page-content" />
            </div>
        </div>
    {:else if cur_page == "rand" || cur_page == "todo"}
        <div class="row card sticky-top" style="margin-top: 20px; border: 0;">
            <div class="col-md-10 text-right">
                <button
                    type="button"
                    class="btn btn-warning"
                    style="float: center"
                    id="editBtn"
                    on:click={editPage}>Edit</button
                >
            </div>
        </div>
        {#if show_status}
            <div class="row">
                <div class="col-md-2" />
                <div class="col-md-6" id="status-sp">
                    <div class="text-center">
                        <div class="spinner-border text-success" role="status">
                            <span class="sr-only">Sending</span>
                        </div>
                    </div>
                </div>
            </div>
        {/if}
        <div class="row">
            <div class="col-md-2" />
            <div class="col-md-6">
                <div class="text-center" style="margin-top: 20px;">
                    <h4>
                        <span class="badge badge-secondary" id="fileName" />
                    </h4>
                </div>
            </div>
            <div class="col-md-2" />
        </div>
        <div class="row">
            <div class="col-md-10">
                <div class="pageContent" id="page-content" />
            </div>
        </div>
    {:else if (cur_page = "find")}
        <div id="search">
            <div class="row">
                <div class="col-md-10">
                    <div class="input-group" style="margin-top: 30px">
                        <input
                            type="text"
                            bind:value={search_input}
                            class="form-control"
                            placeholder="search ..."
                            id="searchInput"
                        />
                        <div class="input-group-append">
                            <button
                                class="btn btn-secondary"
                                type="button"
                                id="searchBtn"
                                style="margin-left: 5px"
                                on:click={search}
                            >
                                <i class="fa fa-search" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {#if show_status}
                <div class="row">
                    <div class="col-md-2" />
                    <div
                        class="col-md-8"
                        hidden="true"
                        id="status-sp"
                        style="margin-top: 20px;"
                    >
                        <div class="text-center">
                            <div
                                class="spinner-border text-success"
                                role="status"
                            >
                                <span class="sr-only">sending</span>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}

            {#if show_search_nav}
                <div
                    class="row card sticky-top"
                    style="margin-top: 20px; border: 0;"
                >
                    <div class="col-md-10 text-right" id="pageNavBar">
                        <button
                            type="button"
                            class="btn btn-info"
                            style="float: left"
                            id="backBtn"
                            on:click={search}>Back</button
                        >
                        <button
                            type="button"
                            class="btn btn-warning"
                            id="editBtn"
                            on:click={editPage}>Edit</button
                        >
                    </div>
                </div>
            {/if}
            <div class="row">
                <div class="col-md-2" />
                <div class="col-md-6">
                    <div class="text-center" style="margin-top: 20px;">
                        <h4>
                            <span class="badge badge-secondary" id="fileName" />
                        </h4>
                    </div>
                </div>
                <div class="col-md-2" />
            </div>

            <div class="row">
                <div class="col-md-10">
                    <div class="pageContent" hidden="true" id="page-content" />
                </div>
            </div>
        </div>
    {/if}
</div>