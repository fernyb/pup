#!/bin/bash

cd /pup

nohup Xvfb :99 -screen 0 1300x1000x24 &

sleep 5

npm run test -- $@

pkill Xvfb
sleep 3

rm -f /tmp/.X99-lock

echo ""
echo "Done"
echo ""
