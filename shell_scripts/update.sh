#!/bin/bash
cd "$(dirname $0)";
cd ..;
echo "$PWD";
npm run stop;
git reset --hard;
git pull origin development && npm run deploy;