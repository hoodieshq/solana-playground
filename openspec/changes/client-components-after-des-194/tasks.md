# Tasks

## 1. Toast progress (HOO-2057)

- [x] 1.1 `ToastHost` draws a `toast-progress` bar for a finite duration,
  none for a persistent toast, hidden under reduced motion and from
  assistive technology; unit tests in `ToastHost.test.tsx` assert the bar,
  its animation duration and its absence when persistent
  ([plan](plans/1-three-components.md))

## 2. Name field (HOO-2057)

- [x] 2.1 `BaseStartFromScratch` shows the message before the field and a
  success edge (`data-state="valid"`) on a valid typed name; unit tests cover
  invalid, valid and empty (independent of 1.1)

## 3. Lesson progress in the list (HOO-2057)

- [x] 3.1 `ProjectEntry` carries lesson progress, `ProjectList` feeds it from
  `useTutorialProgress`, and `BaseProjectList` draws "3/5" or a check with
  its description; unit tests in `project-entries.ts`,
  `BaseProjectList.test.tsx` and `ProjectList.test.tsx` (independent of 1.1
  and 2.1)
