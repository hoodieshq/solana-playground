# Spec Delta

## ADDED Requirements

### Requirement: A tutorial that ships an IDL calls through it
In a tutorial whose steps ship an IDL, a landed deploy SHALL keep the shipped
IDL of the step the learner is on, whatever IDL the build returned, and the
Call panel, the call's encoding and the decoding of its transactions SHALL use
that kept IDL. A build goal SHALL check the instructions the build's own IDL lists
when it lists any, and the shipped IDL's when it lists none (an Anchor 1.1.2
build returns no IDL, which reads the same). A
deploy from the terminal SHALL be kept even when the build returned no IDL.

#### Scenario: A build returns no IDL (manual)
- **WHEN** the learner builds and deploys Hello Anchor on a build route that returns no IDL
- **THEN** the build goal passes, the Call panel lists `hello`, and a call of it lands and passes the step

#### Scenario: A tutorial ships no IDL (manual)
- **WHEN** a tutorial's steps carry no `idl`
- **THEN** the build's IDL is used, as before

### Requirement: A call that does not match the shipped IDL says so
A call SHALL say "Your code no longer matches what this step expects. Fix it
in the editor and build and deploy again." when its transaction did not decode
with the IDL, when the program refused it as an instruction it does not know
or cannot deserialize (Anchor errors 101 and 102), or when the IDL has no such
instruction. An act card's failed call SHALL add ", or I can show you the
lines this step needs." with the "Show me the fix" action, which writes the
step's target program.

#### Scenario: The learner renamed the instruction (manual)
- **WHEN** the learner's deployed program no longer has `hello` and the Call panel sends it
- **THEN** the program refuses it with error 101 and the tutorial says the code no longer matches the step, not a bare error
