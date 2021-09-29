[ ! -d "./ob" ] && git clone git@github.com:chenyukang/ob.git
pushd ob
git checkout main
git pull
popd
cargo build; rm -rf ./ob-web; cp target/debug/ob-web ./ ; RUST_LOG=obweb::api ./ob-web
