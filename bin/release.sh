pushd front
npm run build
popd

cargo build --release;
cp target/release/ob-web ./bin/ ;
cp target/release/rss-reader ./bin/;

mkdir -p ob-web-pack/front
cp -r front/public ob-web-pack/front/
cp target/release/ob-web ob-web-pack/
cp target/release/rss-reader ob-web-pack/

zip -r ob-web-pack.zip ob-web-pack