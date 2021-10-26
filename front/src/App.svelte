<script>
    import Login from "./Login.svelte";
    import Nav from "./Nav.svelte";
    import Index from "./Index.svelte";
    import Day from "./Day.svelte";

    let cur_page = "index";
</script>


<main>
    <Nav bind:cur_page={cur_page}/>

    <div class="container">
        <Login />

        {#if cur_page == "index" }
            <Index />
        {/if}

        {#if cur_page == "day"}
            <Day />
        {/if}

    </div>
</main>

