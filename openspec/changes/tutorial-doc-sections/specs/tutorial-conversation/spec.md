# Spec Delta

## ADDED Requirements

### Requirement: The assistant's context lists each doc page's sections

The tutorial context the assistant answers from SHALL list, for each of the
tutorial's doc pages, its title and address, then each heading of its page
below the title with that heading's address, `page#id`, where `id` is the
heading's id on the page (see `tutorial-workspace`). It SHALL ask the
assistant to link the section's address when one section covers what it
explains, the page's address when none does, with the address exactly as
listed, and one page at most per answer.

#### Scenario: A question about one section
- **WHEN** in Hello Anchor the learner asks about the account types in
  Program Structure
- **THEN** the context the assistant reads lists Program Structure's
  sections, among them
  `#[account] attribute (https://www.anchor-lang.com/docs/basics/program-structure#account-attribute)`
- **AND** a page with no heading below its title is listed by title and
  address alone, as before
