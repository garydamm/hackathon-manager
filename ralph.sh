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
    claude --dangerously-skip-permissions -p "You are Ralph, an autonomous coding agent. Do exactly ONE task per iteration.

## Steps

1. Read PRD.md and find the first task that is NOT complete (marked [ ]).
2. Read progress.txt - check the Learnings section first for patterns from previous iterations.
3. Implement that ONE task only.
4. Run tests/typecheck to verify it works (see Testing Strategy below).

## Testing Strategy

**IMPORTANT**: Repository integration tests cause TestContainers resource exhaustion when run together. See progress.txt Iteration 11 learnings.

**For Backend Tasks (Kotlin/Spring)**:

If you created a **database migration** (src/main/resources/db/migration/*.sql):
  1. Run backend unit tests (controllers/services): \`./gradlew test --tests '*ControllerTest' --tests '*ServiceTest'\`
  2. Run ONLY the specific repository test individually: \`./gradlew test --tests YourNewRepositoryTest\`
     - Example: Created V3__add_user_sessions_table.sql → Run: \`./gradlew test --tests UserSessionRepositoryTest\`
  3. Run typecheck: \`./gradlew build -x test\`

If **no database migration** was created:
  1. Run backend unit tests: \`./gradlew test --tests '*ControllerTest' --tests '*ServiceTest'\`
  2. Run typecheck: \`./gradlew build -x test\`

**For Frontend Tasks (TypeScript/React)**:
- Run tests: \`cd frontend && npm test\`
- Run typecheck: \`cd frontend && npm run typecheck\`

**Note**: Never run \`./gradlew test\` without filters - it will hang on repository tests.

## Critical: Only Complete If Tests Pass

- If tests PASS:
  - Update PRD.md to mark the task complete (change [ ] to [x])
  - Commit your changes with message: feat: [task description]
  - Append what worked to progress.txt

- If tests FAIL:
  - Do NOT mark the task complete
  - Do NOT commit broken code
  - Append what went wrong to progress.txt (so next iteration can learn)

## Progress Notes Format

Append to progress.txt using this format:

## Iteration [N] - [Task Name]
- What was implemented
- Files changed
- Learnings for future iterations:
  - Patterns discovered
  - Gotchas encountered
  - Useful context
---

## Update AGENTS.md (If Applicable)

If you discover a reusable pattern that future work should know about:
- Check if AGENTS.md exists in the project root
- Add patterns like: 'This codebase uses X for Y' or 'Always do Z when changing W'
- Only add genuinely reusable knowledge, not task-specific details

## End Condition

After completing your task, check PRD.md:
- If ALL tasks are [x], output exactly: <promise>COMPLETE</promise>
- If tasks remain [ ], just end your response (next iteration will continue)" | tee "$tmpfile"

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
