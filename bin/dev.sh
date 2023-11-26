pushd front
#npm install
rm -rf ./front/public/*
npm run build
popd

cargo build; rm -rf ./rss-rs; cp target/debug/rss-rs ./ ; RUST_LOG=obweb::api ./rss-rs
