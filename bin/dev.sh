pushd front
#npm install
npm run build
popd

cargo build; rm -rf ./ob-web; cp target/debug/ob-web ./ ; RUST_LOG=obweb::api ./ob-web
