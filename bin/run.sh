pushd ob
git checkout main
git pull
popd
#cargo build --release; rm -rf ./ob-web; cp target/release/ob-web ./ ; cp target/release/rss-reader ./; nohup ./ob-web  >/tmp/nog 2>&1 &
nohup ./ob-web  >/tmp/obweb.log 2>&1 &