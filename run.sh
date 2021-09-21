[ ! -d "./ob" ] && git clone git@github.com:chenyukang/ob.git
pushd ob
git checkout main
git pull
popd
cargo build; cp target/debug/ob-web ./ ; ./ob-web
