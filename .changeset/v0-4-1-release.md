---
"react-native-passkeys": patch
---

- fix(android): resolve JVM target mismatch on AGP 8+ with Kotlin 2.x by unifying Java and Kotlin toolchains via `kotlin.jvmToolchain(17)` (thanks @friederbluemle, #60).
- chore: narrow supported Expo SDK range to `>=53.0.0` to match Expo's own support matrix.
- chore: migrate lint/format tooling from Biome to oxlint + oxfmt.
- docs(android): document the `get_login_creds` Digital Asset Links requirement for passkeys.
