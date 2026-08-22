---
name: to-questionnaire
description: Turn a decision the user cannot answer alone into a questionnaire for someone else to fill in.
disable-model-invocation: true
---

Turn something the user cannot answer alone into a **questionnaire**: a Markdown document the user hands to one person, who fills it in async or answers it with the user in a meeting. The recipient holds knowledge the user lacks. The questionnaire pulls that knowledge out.

**Grill the send, not the subject.** Interview the user only about the _send_, which the user can always answer: who receives the questionnaire, and what the user needs back. The questions in the document then target the **gap** between what the recipient knows and what the user needs.

1. **Who receives it?** Ask, in one exchange, for the recipient's role, expertise, and relationship to the user. The answer sets the tone of the questionnaire and how much context it must carry. Done when you know who the recipient is and what that person knows that the user does not.

2. **What does the user need back?** Ask, in one exchange, for the specific decisions or facts the user cannot resolve alone and needs from this person. Done when you have a concrete list of what the user must walk away able to do or decide.

3. **Write the questionnaire.** Draft questions aimed at the gap from steps 1 and 2, and follow the document structure below. Write the file to `to-questionnaire-<slug>.md` in the current directory, where the slug comes from the topic, then report the path. Done when the file exists and a question covers every item the user named in step 2.

## Document structure

Frame the document as a **discovery questionnaire**: the user lacks context and the recipient holds it. Put the most important questions first, because an async send may get only one pass. Group the questions by theme under `##` headings once there are more than a handful. Use the template below.

<questionnaire-template>

# <Questionnaire title>

**Purpose:** why this questionnaire exists, and the decision that depends on the answers.

**From:** <the user>, **To:** <the recipient>, **How your answers will be used:** <where the answers go>

## Context

One paragraph that orients a recipient who has not seen the user's thinking. Give enough to answer well, not a page.

## How to answer

State the deadline and the rough effort. Tell the recipient that partial answers and "I don't know" both help, and to mark anything they are unsure of instead of skipping it.

## <Theme heading>

Write one `##` section per theme, and put the most important question first in each section. Give each question one idea: never combine two questions into one. Put an answer stub directly under each question. Add a one-line _why this matters_ only where the question could be misread or could invite a throwaway answer.

<question-example>
### What load is the system expected to handle at launch?

_Why this matters: it decides whether we provision for burst traffic now or defer it._

>
</question-example>

## Anything else?

Close with a catch-all: anything we did not ask that we should know?

</questionnaire-template>
