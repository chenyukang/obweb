<script>
    import { onMount } from "svelte";
    const jq = window.$;

    let date = new Date();
    let file = "";
    let content = "";
    let show_status = false;
    let in_edit = false;

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

    function currentDaily() {
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
                file = response[0];
                content = response[1];
                if (file != "NoPage") {
                    localStorage.setItem("page-content", content);
                    localStorage.setItem("file", file);
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

    onMount(async () => {
        getDaily(date);
    });
</script>

<div class="tab-content">
    <div id="daily">
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
        <div class="row">
            <div class="col-md-2" />
            <div class="col-md-6" hidden="true" id="status-sp">
                <div class="text-center">
                    <div class="spinner-border text-success" role="status">
                        {#if show_status}
                            <span class="sr-only">Sending</span>
                        {/if}
                    </div>
                </div>
            </div>
        </div>
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
    </div>
</div>

<style>
    .pageContent {
        margin-top: 20px;
        border: 1px outset green;        
        text-align: left;
        word-wrap: break-word;
        padding: 8px;
    }
</style>
