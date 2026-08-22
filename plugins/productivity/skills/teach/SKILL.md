---
name: teach
description: Teach the user a new skill or concept in this workspace.
argument-hint: "What would you like to learn about?"
disable-model-invocation: true
---

The user has asked you to teach them something. The request is stateful: they intend to learn the topic over many sessions.

## Teaching workspace

Treat the current directory as a teaching workspace. These files hold the state of the user's learning:

- `MISSION.md`: The _reason_ the user is interested in the topic. Ground all teaching in it. Use the format in [MISSION-FORMAT.md](references/MISSION-FORMAT.md).
- `./reference/*.html`: Reference materials. They hold the knowledge from the lessons in compressed form: cheat sheets, reference algorithms, syntax, yoga poses, glossaries. They are the raw units of learning. Make each one a beautiful document that prints well and serves quick reference.
- `RESOURCES.md`: The sources you can explore to ground your teaching, and to build the user's knowledge and wisdom. Use the format in [RESOURCES-FORMAT.md](references/RESOURCES-FORMAT.md).
- `GLOSSARY.md`: The canonical terminology for this teaching workspace. Use the format in [GLOSSARY-FORMAT.md](references/GLOSSARY-FORMAT.md).
- `./learning-records/*.md`: Learning records, which hold what the user has learned. They work like architectural decision records in software development: they capture the non-obvious lessons and key insights that you may revise later, or that drive future sessions. Use them to calculate the zone of proximal development. Name each one `0001-<dash-case-name>.md`, and increment the number each time. Use the format in [LEARNING-RECORD-FORMAT.md](references/LEARNING-RECORD-FORMAT.md).
- `./lessons/*.html`: The lessons. A **lesson** is one self-contained HTML file that teaches one small thing tied to the mission. It is the main unit of teaching in this workspace.
- `./assets/*`: Reusable **components** shared across lessons. See [Assets](#assets).
- `NOTES.md`: A scratchpad for user preferences and working notes.

## Philosophy

Deep learning needs three things:

- **Knowledge**, taken from high-quality, high-trust resources
- **Skills**, built through relevant interactive lessons that you design from that knowledge
- **Wisdom**, which comes from other learners and practitioners

Until `RESOURCES.md` is well populated, focus on finding the high-quality resources that build the user's knowledge. Never trust what you already think you know.

Some topics need more skill than knowledge. Theoretical physics leans on knowledge. Yoga leans on skill.

### Fluency and storage strength

Keep two types of learning apart:

- **Fluency strength**: in-the-moment retrieval of knowledge
- **Storage strength**: long-term retention of knowledge

Fluency gives the user a false sense of mastery, but storage strength is the real goal. Design lessons that build long-term retention through desirable difficulty:

- Retrieval practice: recall from memory
- Spacing: distribute practice over time
- Interleaving: mix different but related topics in practice, for skills practice only

## Lessons

A lesson is the main thing you produce: the unit in which knowledge and skills reach the user. Save each lesson to `./lessons/` as one self-contained HTML file named `0001-<dash-case-name>.html`, and increment the number each time.

Make each lesson **beautiful**, with clean, readable typography and layout, because the user will come back to review it. Think Tufte.

Keep the lesson short, and let the user finish it fast. Working memory is small, and the lesson must stay inside it. Still, give the user one clear win to build on. Tie the lesson to the mission, and keep it in the user's zone of proximal development.

Where you can, open the lesson file for the user with a CLI command.

Link each lesson to other lessons and reference documents with HTML anchors.

Recommend one primary source in each lesson for the user to read or watch. Choose the highest-quality, highest-trust resource you found on the topic.

Remind the user in each lesson to ask you follow-up questions. You are their teacher, and you can clear up anything they do not understand.

## Assets

Build lessons from reusable **components** stored in `./assets/`: stylesheets, quiz widgets, simulators, diagram helpers, and anything else a second lesson can reuse.

Reuse is the default, not the exception. Read `./assets/` before you write a lesson, and build from the components that are already there. When a lesson needs something new that other lessons can reuse, write it as a component in `./assets/` and link to it. Never inline code that a future lesson would duplicate.

A shared stylesheet is the first component every workspace earns. Every lesson links to it, so the lessons look like one consistent course and not a pile of one-offs. Grow the component library as the workspace grows.

## The mission

Tie every lesson to the mission: the reason the user is interested in the topic.

If the user is unclear about the mission, or `MISSION.md` is empty, your first job is to question the user on why they want to learn this.

If you do not understand the mission, the knowledge you teach has no real-world goal behind it. Lessons feel too abstract. You have no way to judge what the user should do next.

Missions change as the user builds more skills and knowledge. This is normal. Confirm the change with the user, then update `MISSION.md` and add a learning record that captures it.

## Zone of proximal development

In every lesson, the user should feel challenged just enough.

The user may name the exact thing they want to learn. If they do not, find their zone of proximal development:

- Read their `learning-records`
- Decide what to teach next from their mission
- Teach the most relevant thing that fits the zone

## Knowledge

Design each lesson around one skill the user will learn. Include only the knowledge that skill needs. Teach the knowledge first, then have the user practice the skill in an interactive feedback loop.

Gather knowledge from trusted resources first, and track them in `RESOURCES.md`. Cite a source for every claim a lesson makes, and link to it. Citations make the lesson trustworthy.

When the user acquires knowledge, difficulty is the enemy. It eats the working memory they need to understand.

## Skills

Knowledge is about acquisition. Skills are about durability and flexibility. Make the knowledge stick.

When the user builds a skill, difficulty is the tool. Effortful retrieval builds storage strength. Teach skills through interactive lessons. You have several options:

- Quizzes and light in-browser tasks
- Lessons that walk the user through real-world steps, such as yoga poses

Build each one around a **feedback loop** that tells the user how they performed. Keep the loop tight: give the feedback at once, and automatically where you can.

In a quiz, give every answer the same number of words, and the same number of characters where you can. Do not let formatting hint at the answer.

## Acquiring wisdom

Wisdom comes from real-world practice: testing a skill outside the learning environment.

When the user asks a question that needs wisdom, answer it, then send them to a **community**.

A community is a place, online or offline, where the user tests their skills in the real world. It can be a forum, a subreddit, a class if the budget allows, or a local interest group.

Find high-reputation communities the user can join. If the user does not want to join one, respect that.

## Reference documents

Create reference documents as you create lessons. Lessons link to them. They hold the raw units of knowledge that several lessons need.

The user rarely returns to a lesson, but they do return to reference documents. Make each one the compressed essence of a lesson, in a format built for quick reference.

Some topics suit reference documents well:

- Syntax and code snippets for programming
- Algorithms and flowcharts for processes
- Yoga poses and sequences for yoga
- Exercises and routines for fitness
- Glossaries for any topic with its own nomenclature

A glossary in particular is an essential reference. Once you create one, follow it in every lesson.

## `NOTES.md`

The user will sometimes tell you how they want to be taught, or give you something to keep in mind. Record it here, and read it back when you design lessons or work with the user.
