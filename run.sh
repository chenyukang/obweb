[ ! -d "./ob" ] && git clone git@github.com:chenyukang/ob.git
pushd ob
git checkout main
git pull
popd
cargo build --release; rm -rf ./ob-web; cp target/release/ob-web ./ ; nohup ./ob-web  >/tmp/nog 2>&1 &
