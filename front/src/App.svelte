<script>
    import Nav from "./Nav.svelte";
    import Index from "./Index.svelte";
    import Page from "./Page.svelte";

    let cur_page = "rss";
    let cur_time = Date.now();
    let page;

    const refresh = (event) => {
        cur_page = event.detail;
        cur_time = Date.now();
    };
</script>

<main>
    <Nav on:message={refresh}/>
    <div class="container">

        {#if cur_page == "index"}
            <Index />
        {:else}
            <Page bind:this={page} bind:cur_page={cur_page} cur_time={cur_time}/>
        {/if}
    </div>
</main>
