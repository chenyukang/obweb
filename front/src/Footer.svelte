<script>
    import { createEventDispatcher } from "svelte";

    const jq = window.$;
    let cur_page;

    const dispatch = createEventDispatcher();
    function handleFooter(event) {
        event.preventDefault();
        let page = event.target.innerText.toLowerCase();
        cur_page = page;
        if (cur_page == "obweb") {
            cur_page = "day";
        }
        dispatch("message", cur_page);
        console.log("dispatched ....");
    }
</script>

<footer class="page-footer fixed-bottom font-small pt-5">
    <div class="container">
        <div class="row">
            <div class="col-md-10">
                <div style="float: center">
                    <button on:click={handleFooter} class="btn btn-sm">Obweb</button>
                    <button on:click={handleFooter} class="btn btn-primary btn-sm">Day</button>
                    <button on:click={handleFooter} class="btn btn-success btn-sm">Find</button>
                    <button on:click={handleFooter} class="btn btn-secondary btn-sm">Rand</button>
                    <button on:click={handleFooter} class="btn btn-info btn-sm">Todo</button>
                    <button on:click={handleFooter} class="btn btn-info btn-sm">Rss</button>
                </div>
            </div>
        </div>
    </div>
</footer>
