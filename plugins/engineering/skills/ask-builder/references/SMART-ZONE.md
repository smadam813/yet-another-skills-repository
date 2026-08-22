# Smart zone

Early in a session the agent is in a "smart zone": sharp, focused, with good recall. As the session grows it drifts into a "dumb zone": sloppier, more forgetful, more mistakes, and more faithfulness hallucinations. Same model, same harness, just more context. This is the felt effect of attention degradation. On frontier models the dumb zone commonly begins around 125K-150K tokens, though the number is debated. Clear or compact when the session bloats; do not push through.

The decline is gradual, which makes it easy to miss. There is no error message and no visible boundary. The agent just starts performing slightly worse, then noticeably worse. Common signs: it forgets an instruction you gave twenty turns ago, repeats a mistake it had already corrected, or confidently asserts something the context contradicts. Because the slide is smooth, the usual response is to push through and re-explain, which adds more context and makes the problem worse.

The zones do not track the context window limit. A session can be deep in the dumb zone with most of the window still free: the limit is where the harness refuses to continue, but quality falls off long before that. Plan around the smart zone, not the window. The practical budget for a task is the tokens the agent works well within, not the tokens it can technically hold.

The smart zone is a budget, and unrelated work spends it. Every task done in a session uses tokens, so starting a second task in the same session starts it closer to the dumb zone. One task per session gives each task the sharpest part of the session. When a single task is bigger than one smart zone, split it: hand off or compact at a natural boundary, and let a fresh session do the next piece.

_Usage:_

"It nailed the first three components and just butchered the fourth."

"You are out of the smart zone — same model, just deep into the dumb zone now. Compact and reload the plan, the next component will land."
