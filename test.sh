#!/bin/bash

# Usage:
# Optional: truffle --network test migrate --reset
# All tests: ./test.sh
# Specific test: ./test.sh test/crowdsale.js

truffle --migrations_directory migrations --network test test "$@"