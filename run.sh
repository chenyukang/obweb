git submodule update --init --recursive;
pushd ob
git checkout main
popd
cargo build; cp target/debug/ob-web ./ ; ./ob-web
