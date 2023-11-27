pushd front
npm run build
popd

cargo build --release; cp target/release/rss-rs ./bin/;
