[ ! -d "./ob" ] && git clone git@github.com:chenyukang/ob.git
pushd ob
git checkout main
git pull
popd
cargo build --release; cp target/release/ob-web ./ ; ./ob-web
