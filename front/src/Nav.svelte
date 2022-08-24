<script>
    import { createEventDispatcher } from "svelte";

    const jq = window.$;
    let cur_page;

    const dispatch = createEventDispatcher();
    function handleNav(event) {
        event.preventDefault();
        cur_page = event.target.innerText.toLowerCase();
        if (cur_page == "obweb") {
            cur_page = "day";
        }
        dispatch('message', cur_page);
        console.log("dispatched ....");
    }
</script>

<nav class="navbar navbar-light" style="background-color: #e3f2fd;">
    <div>
        <a class="navbar-brand" href="/" on:click={handleNav}>Obweb</a>
    </div>

    <div style="float: right">
        <button on:click={handleNav} class="btn btn-primary btn-sm">Day</button>
        <button on:click={handleNav} class="btn btn-success btn-sm">Find</button>
        <button on:click={handleNav} class="btn btn-secondary btn-sm">Rss</button>
        <button on:click={handleNav} class="btn btn-info btn-sm">Todo</button>
    </div>
</nav>
