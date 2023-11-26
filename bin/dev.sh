pushd front
#npm install
npm run build
popd

cargo build; rm -rf ./server; cp target/debug/server ./ ; RUST_LOG=obweb::api ./ob-web
