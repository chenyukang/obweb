pushd front
npm run build
popd

cargo build --release;
cp target/release/ob-web ./bin/ ;
cp target/release/rss-reader ./bin/;

mkdir -p release/front
cp -r front/public release/front/
cp target/release/ob-web release/
cp target/release/rss-reader release/

