<script>
    import { onMount } from "svelte";
    const jq = window.$;

    export let cur_page;
    export let cur_time;
    let file = "";
    let content = "";
    let show_status = false;
    let show_rsslink = false;
    let rsslink = "";
    let publish_time = "";
    let source = "";
    let rss_query_type = "unread";

    export const refresh = (cur) => {
        if (cur_page == "rss") {
            fetchRss();
        }
    };

    $: {
        console.log(cur_time);
        if (cur_page) {
            refresh(cur_page);
        }
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
        let last = 0;
        let left = response;
        while (left.indexOf("[[") != -1) {
            let prev = left.substring(0, left.indexOf("[["));
            result += prev;
            let start = left.indexOf("[[") + 2;
            let end = left.indexOf("]]", start);
            let link = left.substring(start, end);
            left = left.substring(end + 2);
            if (prev.indexOf("```") != -1 && left.indexOf("```") != -1)
                result += "[[" + link + "]]";
            else result += "[" + link.trim() + "](/##)";
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

    function fetchPage(url, query_type = "") {
        let date = new Date();
        let begin_date = new Date(date.setDate(date.getDate() - 1000));
        show_status = true;
        show_rsslink = false;
        let data = {
            path: url,
            query_type: query_type,
        };
        jq.ajax({
            url: "/api/page",
            data: data,
            type: "GET",
            datatype: "json",
            contentType: "Application/json",
            headers: {
                // Important since warp will cache the unmodified files
                "If-Modified-Since": begin_date.toISOString(),
            },
            statusCode: {
                500: function () {
                    window.location.href = "/obweb";
                },
            },
            success: function (response) {
                console.log(response);
                show_status = false;
                file = response[0];
                content = response[1];
                rsslink = response[2];
                publish_time = response[3];
                source = response[4];
                if (file != "NoPage") {
                    localStorage.setItem("page-content", content);
                    localStorage.setItem("file", file);
                    jq("#fileName").text(file.replaceAll(".md", ""));
                    jq("#fileName").prop("hidden", false);
                    jq("#pageNavBar").prop("hidden", false);
                    let res =
                        query_type == "rss" ? content : renderMdToHtml(content);
                    jq("#page-content").html(res);
                    jq("#page-content").prop("hidden", false);
                    console.log(rsslink);
                    if (rsslink != undefined && rsslink != "") {
                        jq("#rsslink").prop("hidden", false);
                        show_rsslink = true;
                        let pos = localStorage.getItem("pos_" + file);
                        pos = pos == null ? 0 : pos;
                        jq("html, body").animate({ scrollTop: pos }, "fast");
                    }
                    setPageDefault();
                    console.log(show_status);
                } else {
                    jq("#page-content").html("<h3>No Page</h3>");
                    jq("#fileName").text(url);
                }
            },
            error: function (err) {
                show_status = false;
                return err;
            },
        });
    }

    function hookInit() {
        jq(".pageContent")
            .off("click")
            .on("click", "a", function (e) {
                e.preventDefault();
                let url = e.target.href;
                if (!url) {
                    return false;
                }
                //console.log(e.target);
                console.log(e.target);
                let internal_link = e.target.getAttribute("id");
                console.log(internal_link);
                if (internal_link != null) {
                    if (url.indexOf("#") != -1) {
                        let type = cur_page == "rss" ? "rss" : "md";
                        fetchPage(internal_link, type);
                    }
                } else {
                    console.log("open ....");
                    window.open(url, "_blank");
                }
            });

        window.onscroll = function () {
            localStorage.setItem("pos_" + file, window.pageYOffset);
        };
    }

    function setPageDefault() {
        jq("#page-content").prop("contenteditable", false);
        jq("#backBtn").prop("hidden", false);
        jq("#markBtn").prop("hidden", true);
        jq("#page-content").css("backgroundColor", "white");
        jq("#editBtn").text("Edit");
        hookInit();
    }

    function markRead() {
        show_status = true;
        jq.ajax({
            url: "/api/rss_mark?index=0",
            type: "POST",
            data: "",
            datatype: "json",
            contentType: "Application/json",
            statusCode: {
                500: function () {
                    window.location.href = "/obweb";
                },
            },
            success: function (response) {
                show_status = false;
                if (response == "ok") {
                    jq("#markBtn").prop("hidden", false);
                    fetchRss();
                }
            },
            error: function (err) {
                show_status = false;
                console.log(err);
                return err;
            },
        });
    }

    function markRemove() {
        show_status = true;
        // get the value of rsslink
        let rsslink = jq("#rsslink").attr("href");
        console.log(rsslink);
        let data = {
            link: rsslink,
        };
        let url = "/api/rss_remove";
        jq.ajax({
            url: url,
            type: "POST",
            data: JSON.stringify(data),
            datatype: "json",
            contentType: "Application/json",
            statusCode: {
                500: function () {
                    window.location.href = "/obweb";
                },
            },
            success: function (response) {
                show_status = false;
                if (response == "ok") {
                    jq("#markRemove").prop("hidden", true);
                }
            },
            error: function (err) {
                show_status = false;
                console.log(err);
                return err;
            },
        });
    }

    function fetchRss() {
        show_status = true;
        show_rsslink = false;
        rss_query_type = localStorage.getItem("rss_query_type") || "unread";
        let data = {
            query_type: rss_query_type,
            limit: 100,
        };
        jq.ajax({
            url: "/api/rss",
            type: "GET",
            data: data,
            datatype: "json",
            contentType: "Application/json",
            statusCode: {
                500: function () {
                    window.location.href = "/obweb";
                },
            },
            success: function (response) {
                show_status = false;
                file = "rss";
                if (response != "no-page") {
                    jq("#page-content").html(renderMdToHtml(response));
                    jq("#page-content").prop("hidden", false);
                    jq("#fileName").prop("hidden", true);
                    jq("#backBtn").prop("hidden", true);
                    jq("#markBtn").prop("hidden", false);
                    jq("#pageNavBar").prop("hidden", true);
                    console.log("set setPageDefault....");
                    jq("#rssread").prop("checked", rss_query_type == "all");
                    console.log("set default: ", rss_query_type);
                    let pos = localStorage.getItem("pos_" + file);
                    pos = pos == null ? 0 : pos;
                    jq("html, body").animate({ scrollTop: pos }, "fast");
                } else {
                    jq("#page-content").html(
                        "<h3>No Page</h3>" + " " + local_date,
                    );
                }
            },
            error: function (err) {
                show_status = false;
                return err;
            },
        });
    }

    function rssRead() {
        rss_query_type = jq(this).prop("checked") === true ? "all" : "unread";
        localStorage.setItem("rss_query_type", rss_query_type);
        cur_page = "rss";
        console.log("rss read:", rss_query_type);
        fetchRss();
    }

    onMount(async () => {
        setPageDefault();
    });
</script>

<div class="tab-content">
    {#if cur_page == "rss"}
        <div class="row sticky-top" style="margin-top: 20px; border: 0;">
            <div class="col-md-2" />
            <div class="col-md-8 text-right" id="pageNavBarRss">
                <button
                    type="button"
                    class="btn btn-info"
                    style="float: left"
                    id="backBtn"
                    hidden="true"
                    on:click={fetchRss}>Back</button
                >

                <button
                    type="button"
                    class="btn btn-info"
                    style="float: left"
                    id="markBtn"
                    hidden="true"
                    on:click={markRead}>Mark</button
                >

                {#if !show_rsslink}
                    <label class="switch" style="float: right">
                        <input
                            id="rssread"
                            type="checkbox"
                            on:click={rssRead}
                        />
                        <span class="slider round"></span>
                    </label>
                {:else}
                    <button
                        type="button"
                        class="btn btn-info"
                        style="float: right"
                        id="markRemove"
                        on:click={markRemove}>Unsubscribe</button
                    >
                {/if}
            </div>
        </div>
    {/if}

    {#if show_status}
        <div class="row">
            <div class="col-md-2" />
            <div class="col-md-8" id="status-sp" style="margin-top: 20px;">
                <div class="text-center">
                    <div class="spinner-border text-success" role="status">
                        <span class="sr-only" />
                    </div>
                </div>
            </div>
        </div>
    {/if}

    <div class="row">
        <div class="col-md-2" />
        <div class="col-md-8">
            <div class="text-center" style="margin-top: 20px;">
                <h4>
                    <span
                        class="badge badge-secondary"
                        style="white-space: pre-line;"
                        hidden="true"
                        id="fileName"
                    />
                </h4>
            </div>
        </div>
        <div class="col-md-2" />
    </div>

    {#if show_rsslink}
        <div class="row">
            <div class="col-md-2" />
            <div class="col-md-8">
                <a href={rsslink} id="rsslink" target="_blank"
                    >{publish_time.split(" ")[0]} 👻 {source}
                </a>
            </div>
        </div>
    {/if}

    <div class="row">
        <div class="col-md-2" />
        <div class="col-md-8">
            <div class="pageContent" hidden="true" id="page-content" />
        </div>
    </div>
</div>
