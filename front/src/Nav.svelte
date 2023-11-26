<script>
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();
    function handleNav(event) {
        event.preventDefault();
        dispatch('message', "rss");
        console.log("dispatched ....");
    }
</script>

<nav class="navbar navbar-light" style="background-color: #e3f2fd;">
    <div>
        <a class="navbar-brand" href="/" on:click={handleNav}>Obweb</a>
    </div>

    <div style="float: right">
        <button on:click={handleNav} class="btn btn-secondary btn-sm">Rss</button>
    </div>
</nav>
