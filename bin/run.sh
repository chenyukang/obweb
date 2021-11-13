pushd ob
git checkout main
git pull
popd

pushd front
npm run build
popd

cargo build --release; rm -rf ./ob-web; cp target/release/ob-web ./ ; cp target/release/rss-reader ./; nohup ./ob-web  >/tmp/nog 2>&1 &
