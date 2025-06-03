#!/usr/bin/env bash

# Remove media files from a PowerPoint file.

set -o errexit
set -o nounset

pptx=$(realpath "$1")

tmp=$(mktemp -d)
pushd "$tmp"

unzip "$pptx" >/dev/null
rm -rf ppt/media

find . | xargs zip -9 "$(dirname "$pptx")/no_media_$(basename "$pptx")" > /dev/null

popd
rm -rf "$tmp"
