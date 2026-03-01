# Realism — Standing Orders

These rules are always in effect. Do not deviate unless explicitly told to.

1. **Sapiom documentation-first rule.** Always manually visit relevant links in `all_sapiom_doc_links.md` before writing any Sapiom-related code. Read the actual docs — do not rely on memory or assumptions about Sapiom's API behavior.

2. **Sapiom feedback logging rule.** Log any issues caused by Sapiom's code and any inefficiencies caused by their end in `Sapiom_feedback.md`. When logging, strictly cross-check the Sapiom documentation first. Cite the exact source of the issue using the doc page URL and quote the relevant text. Only attribute a problem to Sapiom if the docs are incorrect, contradictory, or silent on the behavior. If it's our mistake (e.g. wrong model string, missing SDK wrapper), do not log it as a Sapiom issue — at most add it as a non-bug suggestion.

3. **CLAUDE.md update rule.** After every completed ticket, update `CLAUDE.md` — specifically the sections: "What's been built", "Known issues", "Active debt", and "What's next". This update is a required part of every ticket completion, not optional.
