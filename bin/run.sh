pushd ob
git checkout main
git pull
popd

pushd front
npm run build
popd

nohup ./bin/ob-web  >/tmp/nog 2>&1 &
