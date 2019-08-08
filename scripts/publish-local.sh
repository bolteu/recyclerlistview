#!/usr/bin/env bash
set -e

TARGET=$"/Users/andrii.tiertyshnyi/Documents/Projects/bolt-delivery-provider-app/node_modules/recyclerlistview/dist" #target-path

npm run build

echo "copying build..."
echo "copying to $TARGET.."
rm -rf "$TARGET"
cp -r dist "$TARGET"

echo "copy complete."