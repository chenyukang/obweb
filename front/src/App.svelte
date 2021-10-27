<script>
    import Login from "./Login.svelte";
    import Nav from "./Nav.svelte";
    import Index from "./Index.svelte";
    import Page from "./Page.svelte";    

    let cur_page = "index";
    let cur_time = Date.now();
    let page;

    const refresh = (event) => {
        cur_page = event.detail;
        console.log(cur_page);
        cur_time = Date.now();
    };
</script>

<main>
    <Nav on:message={refresh}/>

    <div class="container">
        <Login />

        {#if cur_page == "index"}
            <Index />
        {:else}
            <Page bind:this={page} bind:cur_page={cur_page} cur_time={cur_time}/>
        {/if}
    </div>
</main>
