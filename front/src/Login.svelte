<script>
    import { onMount } from "svelte";

    const jq = window.$;
    let username = "";
    let password = "";

    onMount(async () => {
        tryLogin();
    });

    // Try to verify token in cookie,
    // if it's not valid we need to show up login modal
    function tryLogin(callback = null) {
        console.log("tryLogin");
        jq.ajax({
            url: "/api/verify",
            type: "GET",
            success: function (response) {
                if (response != "failed") {
                    jq("#loginModal").modal("hide");
                } else {
                    showLoginModal();
                }
                if (callback != null) {
                    callback();
                }
            },
            error: function (err) {
                console.log("TryLogin error: ", err);
                showLoginModal(err.status == 404);
            },
        });
    }

    function showLoginModal(init = false) {
        if (jq("#loginModal").length == 0) {
            window.location.href = "/obwebx";
        }
        jq("#loginModal").modal("show");
        if (init) {
            jq("#loginBtn").text("Initialize Account");
        }
    }

    function handleLogin() {
        let data = JSON.stringify({
            username: username,
            password: password,
        });
        console.log(data);
        jq.ajax({
            url: "/api/login",
            type: "POST",
            datatype: "json",
            contentType: "Application/json",
            data: data,
            success: function (response) {
                if (response != "failed") {
                    let storage = window.localStorage;
                    jq("#loginModal").modal("hide");
                }
            },
            error: function (err) {
                console.log("There was an error when login: ", err);
            },
        });
    }
</script>

<div
    class="modal fade"
    id="loginModal"
    tabindex="-1"
    role="dialog"
    aria-labelledby="exampleModalLabel"
    aria-hidden="true"
>
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header border-bottom-0">
                <button
                    type="button"
                    class="close"
                    data-dismiss="modal"
                    aria-label="Close"
                >
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div class="modal-body">
                <div class="form-title text-center">
                    <h4>Login</h4>
                </div>
                <div class="d-flex flex-column text-center">
                    <form>
                        <div class="form-group">
                            <input
                                type="username"
                                class="form-control"
                                bind:value={username}
                                placeholder="Username"
                            />
                        </div>
                        <div class="form-group">
                            <input
                                type="password"
                                class="form-control"
                                bind:value={password}
                                placeholder="Password"
                            />
                        </div>
                        <button
                            on:click={handleLogin}
                            type="button"
                            class="btn btn-info btn-block btn-round"
                            id="loginBtn">Login</button
                        >
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>
