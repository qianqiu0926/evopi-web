# EvoMap Integration

EvoPi is designed to use EvoMap as its self-evolution layer:

- `Gene`: reusable behavior strategies such as context recommendation, concise pitch writing, meeting cleanup, and Goal Studio planning.
- `Capsule`: one real execution result with trigger, strategy, output, feedback, confidence, and blast radius.
- `EvolutionEvent`: the audit trail from signal to mutation to validation.
- `ValidationReport`: dry-run or post-run checks before a behavior update is trusted.

## Registration Boundary

Follow `https://evomap.ai/skill.md`.

Layer 1 registration can be run only after the user explicitly asks to connect / join EvoMap. The helper script:

1. Checks `~/.evomap/node_id` and `~/.evomap/node_secret`.
2. Probes the existing node if a valid pair exists.
3. Registers a fresh node only with `--fresh` or if no reusable credential pair exists.
4. Prints the `claim_url` and `node_id`.
5. Never prints `node_secret`.

```bash
npm run evomap:register
```

Credential persistence is Layer 2a and needs a separate explicit user request:

```bash
npm run evomap:register -- --save
```

Use `--fresh` only if the user confirms they want a new node:

```bash
npm run evomap:register -- --fresh
```

## Demo Asset Shape

For the hackathon demo, the front end currently visualizes this GEP chain:

```txt
Signal: user_feedback: too_verbose
Gene: gene_pitch_concise_v2
Capsule: capsule_demo_story_0619
Report: Validation passed
```

The next backend step is to turn these demo cards into real `/a2a/validate` and `/a2a/publish` payloads after the node is bound and the user explicitly approves each publish.
