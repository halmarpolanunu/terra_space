#!/bin/sh
set -eu

chown -R terra:terra /data
exec runuser -u terra -- "$@"
