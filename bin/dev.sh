pushd ob
git checkout main
git pull
popd

pushd front
npm install
npm run build
popd

cargo build
rm -rf ./ob-web
RUST_LOG=obweb::api ./target/debug/ob-web
