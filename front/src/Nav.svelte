<script>
import App from "./App.svelte";


    const jq = window.$;
    export let cur_page;

    function handleNav(event) {
        event.preventDefault();
        jq('.navbar .btn').each(function() {
            jq(this).prop("disabled", false);
        });
        event.target.disabled = true;
        cur_page = event.target.innerText.toLowerCase();
        if (cur_page == 'obweb') {
            cur_page = 'index';
        }
    }

</script>

<nav class="navbar navbar-light" style="background-color: #e3f2fd;">
    <div>
        <a class="navbar-brand" href="/" on:click={handleNav}>Obweb</a>
    </div>

    <div style="float: right">
        <button on:click={handleNav} class="btn btn-primary btn-sm">Day</button>
        <button on:click={handleNav} class="btn btn-success btn-sm">Find</button>
        <button on:click={handleNav} class="btn btn-secondary btn-sm">Rand</button>
        <button on:click={handleNav} class="btn btn-info btn-sm">Todo</button>
    </div>
</nav>
