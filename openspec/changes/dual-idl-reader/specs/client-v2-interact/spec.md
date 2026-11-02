# Spec Delta

## ADDED Requirements

### Requirement: A refused IDL says why
When the project's IDL is refused, Interact SHALL show the empty state titled
"This IDL can't be read". For an IDL that is not an Anchor IDL, the notice
SHALL read "You've imported a corrupted IDL. Please double check you've
imported an Anchor IDL." For an Anchor 1.x IDL the client cannot call, the
notice SHALL read "This Anchor 1.x IDL uses <reason>, which Interact cannot
call yet." and the instruction form SHALL not render.

#### Scenario: A 1.x IDL with a custom discriminator (manual)
- **WHEN** the person uploads a 1.x IDL whose instruction `initialize` has a custom discriminator
- **THEN** Interact shows "This IDL can't be read" with the notice "This Anchor 1.x IDL uses a custom discriminator on initialize, which Interact cannot call yet." and no instruction chips
