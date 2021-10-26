<script>
    import Tags from "svelte-tags-input";
    import { onMount } from "svelte";
    const jq = window.$;

    let content = "";
    let tag = [];
    let page = [];
    let image = "";
    let show_image = false;

    let status_visible = false;
    let succ_visible = false;
    let err_visible = false;

    onMount(async () => {
        addImageHook();
        restoreTags();
    });

    function restoreTags() {
        content = window.localStorage.getItem("content");
        let stored_tags = window.localStorage.getItem("tag");
        if (stored_tags != null) {
            tag = stored_tags.trim().split(",").filter(w => w.length > 0);
        }

        let stored_page = window.localStorage.getItem("page");
        if (stored_page != null) {
            page = stored_page.trim().split(",").filter(w => w.length > 0);
        }
    }

    function addImageHook() {
        jq("body").on("click", "img", function (e) {
            let rato = jq(this).width() / jq(this).parent().width();
            if (rato <= 0.6) {
                jq(this).css("width", "100%");
                jq(this).css("height", "100%");
            } else {
                jq(this).css("width", "50%");
            }
        });
    }

    function handleInput(event) {
        jq("#submit-btn").prop("disabled", false);
        window.localStorage.setItem("content", content);
    }

    function handleKeyup(event) {
        if (event.key == "[" || event.key == "]") {
            content = content.replaceAll("【", "[").replaceAll("】", "]");
        }
    }

    function showSuccMsg() {
        status_visible = false;
        succ_visible = true;
    }

    function showErrMsg() {
        status_visible = false;
        err_visible = true;
    }

    function handleTags(event) {
        tag = event.detail.tags;
        window.localStorage.setItem("tag", tag);
    }

    function handlePage(event) {
        page = event.detail.tags;
        window.localStorage.setItem("page", page);
    }

    function handleSave(event) {
        event.preventDefault();
        status_visible = true;
        let data = JSON.stringify({
            date: new Date().toISOString(),
            links: tag.join(","),
            page: page.length > 0 ? page[0] : "",
            text: content,
            image: image,
        });
        console.log(data);
        jq.ajax({
            url: "/api/entry",
            crossDomain: true,
            type: "POST",
            datatype: "json",
            contentType: "Application/json",
            data: data,
            success: function (response) {
                if (response == "ok") {
                    clearAll(event);
                    showSuccMsg();
                } else {
                    showErrMsg();
                }
            },
            error: function (err) {
                showErrMsg();
                console.log("There was an error saving the entry: ", err);
            },
        });
    }

    function fileSelected(event) {
        console.log(event.target);
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            alert("Please select a image.");
            return;
        }

        const img = document.createElement("img-tag");
        img.file = file;

        const reader = new FileReader();
        reader.onload = function (e) {
            show_image = true;
            image = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    function clearInput() {
        content = "";
        window.localStorage.removeItem("content");
    }

    function removePic() {
        show_image = false;
        image = "";
    }

    function clearAll(event) {
        event.preventDefault();
        status_visible = false;
        window.localStorage.removeItem("links");
        window.localStorage.removeItem("page");
        clearInput();
        removePic();
    }

    function handlePaste(event) {
        console.log(event);
        let items = (event.clipboardData || event.originalEvent.clipboardData)
            .items;
        JSON.stringify(items);
        // will give you the mime types
        // find pasted image among pasted items
        let blob = null;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") === 0) {
                blob = items[i].getAsFile();
                break;
            }
        }
        // load image if there is a pasted image
        if (blob !== null) {
            let reader = new FileReader();
            reader.onload = function (e) {
                image = e.target.result;
                show_image = true;
            };
            reader.readAsDataURL(blob);
        }
    }
</script>


<div class="tab-content">
    <form name="entry" role="form">
        <div class="form-group row">
            <div class="col-md-2" />
            <div class="col-md-8">
                <label for="" /><br />
                <textarea
                    bind:value={content}
                    on:input={handleInput}
                    on:keyup={handleKeyup}
                    on:paste={handlePaste}
                    rows="8"
                    class="form-control"
                />
            </div>
        </div>

        <div class="form-group row">
            <div class="col-md-2" />
            <div class="col-md-8">
                <Tags
                    on:tags={handleTags}
                    tags={tag}
                    placeholder="Tags"
                />
            </div>
        </div>

        <div class="form-group row">
            <div class="col-md-2" />
            <div class="col-md-8">
                <Tags
                    on:tags={handlePage}
                    tags={page}
                    placeholder="Link"
                />
            </div>
        </div>

        <div class="row" style="margin-top: 20px">
            <div class="col-md-2" />
            <div class="col-md-8">
                <input
                    on:change={fileSelected}
                    type="file"
                    id="fileElem"
                    class="visually-hidden"
                    accept="image/*"
                />
                <label for="fileElem">Photo</label>
                <button
                    on:click={clearAll}
                    class="btn btn-danger btn-sm">Reset</button
                >
                <button
                    on:click={handleSave}
                    class="btn btn-success float-right"
                    id="submit-btn"
                    type="submit"
                    style="margin-left: 4px;"
                    disabled>Save</button
                >
            </div>
        </div>
    </form>

    <div class="row">
        <div class="col-md-2" />
        <div class="col-md-8" id="status-sp">
            <div class="text-center">
                {#if status_visible}
                    <div
                        class="spinner-border text-success"
                        role="status"
                    >
                        <span class="sr-only">Sending</span>
                    </div>
                {/if}
            </div>
        </div>
    </div>

    <div class="row">
        <div class="col-md-2" />
        <div class="col-md-8">
            <div class="text-center">
                {#if succ_visible}
                    <div
                        class="alert alert-success"
                        role="alert"
                        id="status-msg"
                    >
                        Save Successfully
                    </div>
                {/if}
                {#if err_visible}
                    <div
                        class="alert alert-danger"
                        role="alert"
                        id="status-msg"
                    >
                        Save Failed
                    </div>
                {/if}
            </div>
        </div>
    </div>

    <div class="row" style="margin-top: 20px">
        <div class="col-md-4" />
        {#if show_image}
            <div class="col-md-4">
                <button on:click={removePic} class="close">
                    <span>&times;</span>
                </button>
                <img src={image} style="display: block;" alt="" />
            </div>
        {/if}
    </div>
</div>


<style>
    .visually-hidden {
        position: absolute !important;
        height: 1px;
        width: 1px;
        overflow: hidden;
        clip: rect(1px, 1px, 1px, 1px);
    }

    input.visually-hidden + label {
        background-color: #0070f3;
        border-radius: 5px;
        color: white;
        padding: 7px 12px;
        cursor: pointer;
    }

    input.visually-hidden + label:hover {
        background-color: #1373e4;
    }

    input.visually-hidden + label:active {
        background-color: #1f6bc3;
    }

    input.visually-hidden:focus + label {
        outline: thin dotted;
    }

    input.visually-hidden:focus-within + label {
        outline: thin dotted;
    }

    .tab-content img {
        display: block;
        margin-left: auto;
        margin-right: auto;
        width: 50%;
        /* height: 50%; */
    }
</style>
