#!/bin/bash
set -e;
cd "$(dirname $0)";
cd ..;
echo "$PWD";
mkdir -p "./server-backups";

npm run stop;

echo "Starting backup...";
filename="$(echo "./server-backups/""$(date --utc +"%Y-%m-%dT%H:%M:%S.%3NZ")""_backup.tar.gz")";
tar -vczf "$filename" "./server-files";
echo "Deleting backups older than 7 days...";
find "./server-backups" -mtime +7 -type f -delete;
echo "Backup done. Starting server...";

npm run deploy;