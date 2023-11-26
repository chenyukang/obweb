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
        <a class="navbar-brand" href="/" on:click={handleNav}>Rss Reader</a>
    </div>
</nav>
