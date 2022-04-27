pushd ob
git checkout main
git pull
popd

pushd front
npm install
npm run build
popd

npm run dev

