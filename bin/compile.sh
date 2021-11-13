pushd front
npm run build
popd

cargo build --release; cp target/release/ob-web ./bin/ ; cp target/release/rss-reader ./bin/;
