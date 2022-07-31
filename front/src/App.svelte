<script>
    import Login from "./Login.svelte";
    import Nav from "./Nav.svelte";
    import Day from "./Day.svelte";
    import Page from "./Page.svelte";

    let cur_page = "day";
    let cur_time = Date.now();

    const refresh = (event) => {
        cur_page = event.detail;
        cur_time = Date.now();
    };
</script>

<main>
    <Nav on:message={refresh}/>
    <div class="container">
        <Login />
        {#if cur_page == "day"}
            <Day />
        {:else}
            <Page bind:cur_page={cur_page} cur_time={cur_time}/>
        {/if}
    </div>
</main>
