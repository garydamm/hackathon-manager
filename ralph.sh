#!/bin/bash
set -e

MAX=${1:-10}
SLEEP=${2:-2}

echo "Starting Ralph - Max $MAX iterations"
echo ""

for ((i=1; i<=$MAX; i++)); do
    echo "==========================================="
    echo "  Iteration $i of $MAX"
    echo "==========================================="

    # Create temporary file for output capture
    tmpfile=$(mktemp)

    # Run claude with tee to show output AND capture it
    claude --dangerously-skip-permissions -p "$(cat ralph-prompt.md)" | tee "$tmpfile"

    echo ""

    # Check the captured output for completion marker
    if grep -q "<promise>COMPLETE</promise>" "$tmpfile"; then
        echo "==========================================="
        echo "  All tasks complete after $i iterations!"
        echo "==========================================="
        rm "$tmpfile"
        exit 0
    fi

    rm "$tmpfile"
    sleep $SLEEP
done

echo "==========================================="
echo "  Reached max iterations ($MAX)"
echo "==========================================="
exit 1
