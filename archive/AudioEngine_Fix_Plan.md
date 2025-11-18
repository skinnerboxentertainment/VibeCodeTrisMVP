# AudioEngine Timing Issue Fix Plan

## Problem Description
The application is encountering an `Uncaught Error: Start time must be strictly greater than previous start time` originating from the audio scheduling logic. This error indicates that new audio events are being scheduled at a timestamp that is less than or equal to the previously scheduled event, violating a strict monotonicity requirement in the audio engine.

## Root Cause Analysis
The core issue lies in how `AudioEngine.handleSnapshot` and `RulesEngine.handleEvent` interact regarding audio event timing.
1.  `AudioEngine.handleSnapshot` iterates through game events and calculates an initial `scheduledTime` for each, passing it to `RulesEngine.handleEvent`.
2.  However, certain events (e.g., `hardDrop`, `lineClear`) within `RulesEngine.handleEvent` trigger *multiple* individual sound events (arpeggios, chords) with internal, relative offsets.
3.  The `AudioEngine`'s `lastScheduledTime` is updated based on the *initial* `scheduledTime` it passed to `RulesEngine.handleEvent`, not the actual completion time of the *last* sound event scheduled by that rule.
4.  If two such complex events occur in rapid succession, the `scheduledTime` for the second event (as determined by `AudioEngine`) can be earlier than the actual end time of the first event's arpeggio/chord, leading to the "start time" assertion failure.

## Proposed Solution
The solution involves refactoring the `RulesEngine.handleEvent` method to accurately report the final scheduled time of all its triggered audio events back to the `AudioEngine`. This ensures that `AudioEngine`'s `lastScheduledTime` is always correctly updated, maintaining strict monotonicity.

### Step-by-Step Plan:

1.  **Modify `RulesEngine.handleEvent` Signature:**
    *   Change the method signature to explicitly require a `when: number` parameter (removing `?`).
    *   Modify the method to `return number`, representing the timestamp of the *last* audio event scheduled by that rule.
    *   Adjust the initial conditional statement (`if (!rule && ...)`) to return the `when` value if no specific rule is matched, ensuring consistent time progression.

2.  **Update `RulesEngine.handleEvent` Logic for Each Event Type:**
    *   Go through each `case` in the `switch (ev.type)` statement and any other `if` blocks that trigger sounds.
    *   For each sound trigger (`instrument.trigger(...)`), ensure that the `when` parameter is correctly calculated, taking into account any internal offsets (e.g., `now + i * 0.05`).
    *   The method should return the latest `when` value used for any sound triggered within that event handler. For events that trigger multiple sounds with offsets, this will be `initialWhen + largestOffset`.

3.  **Update `AudioEngine.handleSnapshot` Loop:**
    *   Modify the `snapshot.events.forEach` loop.
    *   The `this.rulesEngine!.handleEvent(event, snapshot, scheduledTime)` call should now capture the returned `number`.
    *   Update `this.lastScheduledTime` with this returned value: `this.lastScheduledTime = this.rulesEngine!.handleEvent(event, snapshot, scheduledTime);`

This approach will create a robust timing mechanism, preventing future "start time" errors by ensuring that the `AudioEngine` always has an accurate understanding of when the audio system will be free to schedule the next event.
