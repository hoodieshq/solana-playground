# Graph Report - design-system  (2026-10-28)

## Corpus Check
- 322 files · ~464,921 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (no extension)
- Styles: the 6 .css files (tokens.css included) come from a separate styles pass, since graphify has no CSS extractor; `uses_token` edges tie each .ts/.tsx file to the @theme variables and @utility classes its Tailwind classes resolve to

## Summary
- 2520 nodes · 8625 edges · 116 communities (103 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 49 edges (avg confidence: 0.85)
- Token cost: 276,231 input · 0 output

## Community Hubs (Navigation)
- Design Tokens (tokens.css)
- Code Blocks and Diagnostics (2)
- Chat Messages and Attachments (2)
- Design Tokens (tokens.css)
- Tailwind Theme and Code Views
- v1 Code Check Tests
- v2 Lesson Script Data
- Styles: lumberjack.ts
- Tailwind Theme and Code Views
- Prototype v2 Stylesheet
- Composer and Setup List (4)
- Console Drawer and Editor Tabs
- v1 Code Check Tests (2)
- Prototype v2 Stylesheet
- v1 Desktop Nav and Glyphs (2)
- v1 Code Check Tests (3)
- shadcn Components Config
- v1 Gallery Catalog
- Merge Conflict UI
- Composer and Setup List (2)
- Select and Input Groups
- Empty States and Async Button
- Tailwind Theme and Code Views (2)
- v1 Desktop Nav and Glyphs
- Cards, Tables, Accordion
- Cards, Tables, Accordion (2)
- Prototype v2 Stylesheet (2)
- v1 Code Check Tests (4)
- DS Site App Shell (2)
- Fields and Button Groups
- v2 Thumbs and Card Types
- Styles: zero-copy.ts
- v2 Canned Answers (2)
- Lessons and Principles
- v2 Build History and Handoff
- Code Blocks and Diagnostics (2) (2)
- v2 Desktop Nav (4)
- Vite Build Tooling
- App TypeScript Config
- v1 Desktop Nav and Glyphs (2) (2)
- v1 Tutorial Store and Data (2)
- Chat Messages and Attachments
- Design Tokens (tokens.css) (2)
- v2 Iso Voxel Art
- Node TypeScript Config
- Stepper Lab and React Root
- v2 Build History and Handoff
- shadcn Components Config (2)
- v2 Desktop Nav (3)
- Buttons, Drawer, Questionnaire
- v2 Thumbs and Card Types (2)
- v2 Store Reducer
- Buttons, Drawer, Questionnaire (2)
- v2 Iso Voxel Art (2)
- v2 Store Reducer (2)
- Stylesheet Entry and Runtime Deps
- Lessons and Principles
- v2 Thumbs and Card Types (2) (2)
- Menubar, Pagination, Breadcrumb (2)
- v1 Desktop Nav and Glyphs (2) (2)
- Tailwind Theme and Code Views (3)
- Carousel
- Stylesheet Entry and Runtime Deps (2)
- Tailwind Theme and Code Views (4)
- Tailwind Theme and Code Views (2) (2)
- v2 Store Reducer (2)
- Sidebar and Inputs
- v2 Build History and Handoff (2)
- Component Registry
- Dialogs and Command Menu (2)
- v1 Desktop Nav and Glyphs (4)
- v2 Thumbs and Card Types (2) (2)
- v2 Thumbs and Card Types (3)
- Lessons and Principles (2)
- Tailwind Theme and Code Views (2) (3)
- v2 Store Reducer (2) (2)
- v2 Stand Package
- Stylesheet Entry and Runtime Deps
- v1 Desktop Nav and Glyphs (3)
- v2 Build History and Handoff (3)
- Registry and Snapshot Scripts (2)
- v2 Store Reducer (4)
- Select and Input Groups (2)
- Buttons, Drawer, Questionnaire (2)
- v2 Thumbs and Card Types (4)
- Start Here Surface Styles
- Tailwind Theme and Code Views (3)
- Navigation Menu Blocks
- Start Here Surface Styles
- Code Blocks and Diagnostics (2) (2)
- Menubar, Pagination, Breadcrumb (3)
- Combobox (2)
- Cards, Tables, Accordion (2)
- Composer and Setup List
- Runtime Dependencies (2)
- Alert Dialog
- v2 Resizable Column
- v2 Vercel Config
- v1 Vercel Config
- DS Site App Shell
- Menu Motion Tokens
- v2 Iso Voxel Art (3)
- Favicon
- Battle Game Thumbs
- Hello Solana Thumb
- SPL Token Vault Thumb
- Tiny Adventure Thumbs
- Zero Copy Thumb
- Site Script
- Design Tokens (tokens.css) (2) (2)
- Combobox (3)
- Unused: warning-foreground
- Community 112
- Community 113

## God Nodes (most connected - your core abstractions)
1. `react` - 179 edges
2. `PlaygroundComponents()` - 138 edges
3. `--color-muted-foreground (@theme)` - 107 edges
4. `lucide-react` - 98 edges
5. `--color-foreground (@theme)` - 98 edges
6. `Button()` - 96 edges
7. `cn` - 86 edges
8. `useStore()` - 84 edges
9. `--color-border (@theme)` - 76 edges
10. `Overlays()` - 64 edges

## Surprising Connections (you probably didn't know these)
- `Tailwind 4` --references--> `tailwindcss`  [EXTRACTED]
  README.md → package.json
- `shadcn/ui` --references--> `shadcn`  [EXTRACTED]
  README.md → package.json
- `Step bar lab prototype entry (src/prototype/stepper-lab/main.tsx)` --conceptually_related_to--> `Stepper component`  [INFERRED]
  prototype/stepper-lab/index.html → README.md
- `AttachmentAction()` --calls--> `Button()`  [EXTRACTED]
  src/components/ui/attachment.tsx → src/components/ui/button.tsx
- `ComboboxChip()` --calls--> `Button()`  [EXTRACTED]
  src/components/ui/combobox.tsx → src/components/ui/button.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Installing own components into client-v2 from the local @playground registry** — readme_ds_add, readme_registry_json, readme_playground_registry_namespace, readme_playground_tokens_item, readme_client_v2 [EXTRACTED 1.00]
- **Studio reads the design system through data-slot specimens and ds-inject.css** — readme_studio, readme_shadcn_component_convention, readme_studio_add_tab, readme_studio_slot_picking, readme_ds_inject_css, readme_page_snapshot [EXTRACTED 1.00]
- **Tutorial prototype stands behind fail-closed basic auth with noindex, verified by anonymous requests** — prototype_vercel_readme_basic_auth_middleware, prototype_vercel_readme_anonymous_check, prototype_vercel_v2_readme_basic_auth_middleware, prototype_vercel_v2_readme_anonymous_check [INFERRED 0.85]
- **Prototype tutorial gallery cover thumbnails** — public_prototype_thumbs_bank_simulator, public_prototype_thumbs_battle_coins, public_prototype_thumbs_boss_battle, public_prototype_thumbs_counter_pda_tutorial, public_prototype_thumbs_expense_tracker, public_prototype_thumbs_faucet_seahorse, public_prototype_thumbs_hello_anchor, public_prototype_thumbs_hello_seahorse [INFERRED 0.85]
- **Prototype tutorial gallery cover thumbnails** — public_prototype_thumbs_hello_solana, public_prototype_thumbs_lumberjack, public_prototype_thumbs_spl_token_vault, public_prototype_thumbs_tictactoe_seahorse, public_prototype_thumbs_tiny_adventure_two, public_prototype_thumbs_tiny_adventure, public_prototype_thumbs_todo_app_seahorse, public_prototype_thumbs_zero_copy [INFERRED 0.85]

## Communities (116 total, 13 thin omitted)

### Community 0 - "Design Tokens (tokens.css)"
Cohesion: 0.03
Nodes (94): --color-accent (@theme), --color-brand-deep-green (@theme), --color-brand-ink (@theme), --color-brand-periwinkle (@theme), --color-brand-teal (@theme), --color-chart-1 (@theme), --color-chart-2 (@theme), --color-chart-3 (@theme) (+86 more)

### Community 1 - "Code Blocks and Diagnostics (2)"
Cohesion: 0.06
Nodes (55): Accordion(), AccordionContent(), AccordionItem(), AccordionTrigger(), Avatar(), AvatarFallback(), AvatarGroup(), ButtonGroup() (+47 more)

### Community 2 - "Chat Messages and Attachments (2)"
Cohesion: 0.06
Nodes (63): BAND, DELETED_NAME, HUNK_ACTION, hunkGroup(), Merge(), MergeBand, MergeContext, MergeCount() (+55 more)

### Community 3 - "Design Tokens (tokens.css)"
Cohesion: 0.12
Nodes (27): class-variance-authority, cn, radix-ui, react, BubbleReactions(), bubbleReactionsVariants, MessageScrollerButton(), NativeSelectProps (+19 more)

### Community 4 - "Tailwind Theme and Code Views"
Cohesion: 0.04
Nodes (55): --animate-menu-in (@theme), --animate-pop (@theme), --color-accent-foreground (@theme), --color-error-foreground (@theme), --color-info-foreground (@theme), --color-sidebar (@theme), --color-sidebar-accent-foreground (@theme), --color-sidebar-foreground (@theme) (+47 more)

### Community 5 - "v1 Code Check Tests"
Cohesion: 0.08
Nodes (40): BEATS, Editor(), EditorError, diffLines(), Row, trimContext(), litLines(), CLASS (+32 more)

### Community 6 - "v2 Lesson Script Data"
Cohesion: 0.07
Nodes (36): Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem(), CommandList(), CommandShortcut() (+28 more)

### Community 7 - "Styles: lumberjack.ts"
Cohesion: 0.05
Nodes (47): CHECKS, clientTx(), HELLO_ANCHOR, LIB_NAMED, namedTx(), onDevnet(), STEPS, LESSONS (+39 more)

### Community 8 - "Tailwind Theme and Code Views"
Cohesion: 0.06
Nodes (44): BrandButtonIcon(), CalloutTitle(), MenuFold(), MenuFoldChevron(), MenuFoldContent(), MenuFoldTrigger(), MenuItemDescription(), MenuItemText() (+36 more)

### Community 9 - "Prototype v2 Stylesheet"
Cohesion: 0.04
Nodes (49): --safe-bottom, --tablet-safe-bottom, --tooth, --accent, --accent-fill-hover, --accent-foreground, --background, --border (+41 more)

### Community 10 - "Composer and Setup List (4)"
Cohesion: 0.09
Nodes (42): App(), ChatColumn(), ShortcutsDialog(), DesktopApp(), useKeyboardRoom(), DockedTree(), flashKeys(), Gallery() (+34 more)

### Community 11 - "Console Drawer and Editor Tabs"
Cohesion: 0.11
Nodes (40): AsyncButton(), Button(), Spinner(), ActionBar(), mac, PRIMARY_KEYS, primaryFor(), COARSE (+32 more)

### Community 12 - "v1 Code Check Tests (2)"
Cohesion: 0.09
Nodes (39): DEMO_FAUCET, DEMO_FILES, deployLog(), EXTRA_FILES, fundLog(), IDL_ACCOUNT, PROGRAM_ID, TX_SIGNATURE (+31 more)

### Community 13 - "Prototype v2 Stylesheet"
Cohesion: 0.06
Nodes (31): Breadcrumb(), BreadcrumbItem(), BreadcrumbLink(), BreadcrumbList(), BreadcrumbPage(), BreadcrumbSeparator(), Menubar(), MenubarContent() (+23 more)

### Community 14 - "v1 Desktop Nav and Glyphs (2)"
Cohesion: 0.08
Nodes (43): buildOk(), clientOf(), firstAct(), libOf(), libTargetOf(), upgradeLog(), primaryFor(), askBlocks() (+35 more)

### Community 15 - "v1 Code Check Tests (3)"
Cohesion: 0.10
Nodes (34): thumb(), Conversation(), edges(), glide(), Group, groups(), isNew(), liveIn() (+26 more)

### Community 16 - "shadcn Components Config"
Cohesion: 0.11
Nodes (37): BUILD_OK, BuildResult, callLog(), clientLog(), INITIAL_FILES, LessonBlock, LIB_NAMED, NAME_MAX (+29 more)

### Community 17 - "v1 Gallery Catalog"
Cohesion: 0.11
Nodes (34): sonner, TutorialCard, TUTORIALS, Gallery(), PATTERN, TutorialsBody(), Card(), TutorialLevels() (+26 more)

### Community 18 - "Merge Conflict UI"
Cohesion: 0.07
Nodes (35): dependencies, @base-ui/react@^1.8.0, class-variance-authority@^0.7.1, cmdk@^1.1.1, cn@^0.4.0, date-fns@^4.4.0, embla-carousel-react@^8.6.0, @fontsource-variable/geist@^5.3.0 (+27 more)

### Community 19 - "Composer and Setup List (2)"
Cohesion: 0.14
Nodes (26): Achievement(), AchievementLabel(), AchievementMedia(), Toaster(), TooltipProvider(), App(), DesktopApp(), useKeyboardRoom() (+18 more)

### Community 20 - "Select and Input Groups"
Cohesion: 0.16
Nodes (20): EditorError, diffLines(), Row, freshLines(), CLASS, CodeView(), hang(), highlight() (+12 more)

### Community 21 - "Empty States and Async Button"
Cohesion: 0.14
Nodes (30): Switch(), TodayBar(), TodayGlyph(), TodayPhoneTrack(), RunnerUpBar(), ChatMock(), DECISION, LINES (+22 more)

### Community 22 - "Tailwind Theme and Code Views (2)"
Cohesion: 0.13
Nodes (27): Chip, Predict, Feed(), inFlight(), land(), Msg, Question(), Quote (+19 more)

### Community 23 - "v1 Desktop Nav and Glyphs"
Cohesion: 0.12
Nodes (29): App(), Fact(), Nav(), NavEntry, NavGroup, readTheme(), useCurrent(), useNav() (+21 more)

### Community 24 - "Cards, Tables, Accordion"
Cohesion: 0.09
Nodes (31): BAYER, blend(), BRAND, buildMark(), buildScene(), CELL_SIZES, chroma(), clamp01() (+23 more)

### Community 25 - "Cards, Tables, Accordion (2)"
Cohesion: 0.09
Nodes (31): BAYER, blend(), BRAND, buildMark(), buildScene(), CELL_SIZES, chroma(), clamp01() (+23 more)

### Community 26 - "Prototype v2 Stylesheet (2)"
Cohesion: 0.16
Nodes (28): LESSON, NEXT_TUTORIAL, Finish(), useOpenTutorial(), lastTx(), stepTx(), TxResult, txResults() (+20 more)

### Community 27 - "v1 Code Check Tests (4)"
Cohesion: 0.12
Nodes (28): clientView(), pace(), Runner(), stageMs(), Turn, Blocks(), HeapBar(), kb() (+20 more)

### Community 28 - "DS Site App Shell (2)"
Cohesion: 0.12
Nodes (29): TUTORIALS, LAYER, LitGround(), SearchGlyph(), tiles(), TutorialsBody(), Card(), FilterButton() (+21 more)

### Community 29 - "Fields and Button Groups"
Cohesion: 0.14
Nodes (25): ConsoleDrawer(), ConsoleDrawerActions(), ConsoleDrawerBar(), ConsoleDrawerContent(), ConsoleDrawerContext, ConsoleDrawerStatus(), Ctx, EditorTab() (+17 more)

### Community 30 - "v2 Thumbs and Card Types"
Cohesion: 0.12
Nodes (26): bus, FLASH_MS, useFlash(), Avatar(), ClusterDot(), Nav(), OPEN_ONLY, RAIL_ONLY (+18 more)

### Community 31 - "Styles: zero-copy.ts"
Cohesion: 0.09
Nodes (26): args(), BIG, BIG_MAP_PDA, CHECKS, grow(), HEAP, initBoard(), KB (+18 more)

### Community 32 - "v2 Canned Answers (2)"
Cohesion: 0.13
Nodes (24): ComboboxContent(), ComboboxEmpty(), ComboboxItem(), ComboboxList(), NavigationMenu(), NavigationMenuContent(), NavigationMenuItem(), NavigationMenuLink() (+16 more)

### Community 33 - "Lessons and Principles"
Cohesion: 0.16
Nodes (28): One chat flow, a lesson module per tutorial, Fix it key: the line that is the fix; Build lets the compiler judge the rest, Open lesson: a store per lesson, its own saved key, ?tutorial=, Ladder: Hello Anchor, Lumberjack, then Zero Copy, Lesson: card, copy, steps, files, checks, runTx, callTx, game, memory, Lumberjack vs the original: unused fields gone, InitSpace, real time refill, Lumberjack signature moments: player card, error by name, energy back with no transaction, Lumberjack step 1 Player: planned init without system_program, Fix it (+20 more)

### Community 34 - "v2 Build History and Handoff"
Cohesion: 0.10
Nodes (19): Attachment(), AttachmentAction(), AttachmentContent(), AttachmentDescription(), AttachmentMedia(), attachmentMediaVariants, AttachmentTitle(), attachmentVariants (+11 more)

### Community 35 - "Code Blocks and Diagnostics (2) (2)"
Cohesion: 0.09
Nodes (17): ButtonGroupSeparator(), Field(), FieldSeparator(), fieldVariants, Item(), ItemActions(), ItemContent(), ItemDescription() (+9 more)

### Community 36 - "v2 Desktop Nav (4)"
Cohesion: 0.10
Nodes (22): CodeBlock(), CodeBlockActions(), CodeBlockContent(), CodeBlockHeader(), CodeBlockLine(), CodeBlockTitle(), MergePaneTabs(), Segmented() (+14 more)

### Community 37 - "Vite Build Tooling"
Cohesion: 0.21
Nodes (26): checkOwn(), fixOf(), fnName(), helloSays(), holds(), insertBlock(), lineOf(), lines() (+18 more)

### Community 38 - "App TypeScript Config"
Cohesion: 0.10
Nodes (24): actionWord(), Answer, answerFor(), CHANGE_CHIP, CHANGE_TEXT, Context, EXPLAIN_STEP, FALLBACK (+16 more)

### Community 39 - "v1 Desktop Nav and Glyphs (2) (2)"
Cohesion: 0.18
Nodes (26): callLog(), clientLog(), faucetLog(), panelLog(), pascal(), programLog(), units(), actUp() (+18 more)

### Community 40 - "v1 Tutorial Store and Data (2)"
Cohesion: 0.10
Nodes (14): SidebarContext, SidebarContextProps, sidebarMenuButtonVariants, SidebarMenuSkeleton(), SidebarProvider(), SidebarRail(), SidebarTrigger(), useSidebar() (+6 more)

### Community 41 - "Chat Messages and Attachments"
Cohesion: 0.22
Nodes (18): lucide-react, BrandButton(), brandButtonVariants, ObjectiveMeter(), STEPS, thumb(), byWindow(), clamp() (+10 more)

### Community 42 - "Design Tokens (tokens.css) (2)"
Cohesion: 0.27
Nodes (16): Drawer(), DrawerContent(), DrawerDescription(), DrawerFooter(), DrawerHeader(), DrawerOverlay(), DrawerPortal(), DrawerTitle() (+8 more)

### Community 43 - "v2 Iso Voxel Art"
Cohesion: 0.13
Nodes (22): beatIdsOf(), beatsOf(), cardOf(), filesOf(), openLesson(), cardOf(), Ctx, LADDER (+14 more)

### Community 44 - "Node TypeScript Config"
Cohesion: 0.09
Nodes (22): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+14 more)

### Community 45 - "Stepper Lab and React Root"
Cohesion: 0.12
Nodes (20): Design system page HTML entry (src/main.tsx), ds-theme localStorage light/dark bootstrap script, client-v2 (consumer app), src/components/ui (60 stock shadcn + 27 own), yarn ds-add (one-step install into client-v2), ds-inject.css, src/ds design system page (foundations, component blocks, migration map), solana-playground-ds.vercel.app (DS page + product + Studio) (+12 more)

### Community 46 - "v2 Build History and Handoff"
Cohesion: 0.15
Nodes (23): Principle: the lesson is the conversation, Principle: question, then code, Client call 10/23, Call panel built from the deployed IDL, Chat driven flow: the lesson is the conversation, Client deck v2 (pg-tutorial-flow-deck-v2), Design prototype, not production code, Direction A Quiet IDE: the frame and the rules (+15 more)

### Community 47 - "shadcn Components Config (2)"
Cohesion: 0.19
Nodes (18): checkOwn(), helloSays(), holds(), insertBlock(), lineOf(), lines(), msgLine(), norm() (+10 more)

### Community 48 - "v2 Desktop Nav (3)"
Cohesion: 0.19
Nodes (19): PROGRAM_ID, shortKey(), TX_SIGNATURE, openExplorer(), KeyRow(), ProgramId(), Transaction(), at() (+11 more)

### Community 49 - "Buttons, Drawer, Questionnaire"
Cohesion: 0.16
Nodes (20): MENU_KEYS, Avatar(), ClusterDot(), Nav(), OPEN_ONLY, RAIL_ONLY, RailButton(), read() (+12 more)

### Community 50 - "v2 Thumbs and Card Types (2)"
Cohesion: 0.30
Nodes (12): CopyButton(), HelpTip(), SidebarMenuButton(), Tooltip(), TooltipContent(), TooltipTrigger(), StepTrack(), Add (+4 more)

### Community 51 - "v2 Store Reducer"
Cohesion: 0.18
Nodes (16): DeviceFrame(), TABLET, useTabletScale(), resetDesktop(), PrototypeBar(), Bar, installScrollIndicator(), SIZES (+8 more)

### Community 52 - "Buttons, Drawer, Questionnaire (2)"
Cohesion: 0.10
Nodes (20): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+12 more)

### Community 53 - "v2 Iso Voxel Art (2)"
Cohesion: 0.13
Nodes (19): Migration(), ONLY, OURS, Row, Rows(), STATE_LABEL, Steps(), STOCK (+11 more)

### Community 54 - "v2 Store Reducer (2)"
Cohesion: 0.19
Nodes (15): DeviceFrame(), TABLET, useTabletScale(), resetDesktop(), PrototypeBar(), Bar, installScrollIndicator(), SIZES (+7 more)

### Community 55 - "Stylesheet Entry and Runtime Deps"
Cohesion: 0.13
Nodes (7): buttonVariants, Calendar(), CalendarDayButton(), QuestionnaireNext(), QuestionnairePrevious(), QuestionnaireSkip(), QuestionnaireSubmit()

### Community 56 - "Lessons and Principles"
Cohesion: 0.18
Nodes (17): Empty(), EmptyContent(), EmptyDescription(), EmptyHeader(), EmptyMedia(), emptyMediaVariants, EmptyTitle(), arriving() (+9 more)

### Community 57 - "v2 Thumbs and Card Types (2) (2)"
Cohesion: 0.15
Nodes (17): ActionCard(), ActionCardAction(), ActionCardContent(), ActionCardDescription(), ActionCardEyebrow(), ActionCardLink(), ActionCardMedia(), ActionCardTitle() (+9 more)

### Community 58 - "Menubar, Pagination, Breadcrumb (2)"
Cohesion: 0.14
Nodes (9): ComboboxChip(), ComboboxClear(), ComboboxInput(), ComboboxTrigger(), InputGroupButton(), inputGroupButtonVariants, InputGroupInput(), Input() (+1 more)

### Community 59 - "v1 Desktop Nav and Glyphs (2) (2)"
Cohesion: 0.18
Nodes (15): AspectRatio(), Carousel(), CarouselApi, CarouselContent(), CarouselContext, CarouselContextProps, CarouselItem(), CarouselNext() (+7 more)

### Community 60 - "Tailwind Theme and Code Views (3)"
Cohesion: 0.14
Nodes (16): Composer(), ComposerAdd(), ComposerBanner(), ComposerChip(), ComposerContext, ComposerContextList(), ComposerContextValue, ComposerEffort() (+8 more)

### Community 61 - "Carousel"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 62 - "Stylesheet Entry and Runtime Deps (2)"
Cohesion: 0.34
Nodes (12): AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay() (+4 more)

### Community 63 - "Tailwind Theme and Code Views (4)"
Cohesion: 0.13
Nodes (14): Diagnostic(), DiagnosticCode(), DiagnosticDescription(), DiagnosticFooter(), DiagnosticHeader(), DiagnosticLine(), DiagnosticSource(), DiagnosticTitle() (+6 more)

### Community 64 - "Tailwind Theme and Code Views (2) (2)"
Cohesion: 0.17
Nodes (11): Hello Anchor tutorial prototype v1 entry (src/prototype/tutorial/main.tsx), Hello Anchor tutorial prototype v2 entry (src/prototype/tutorial-v2/main.tsx), build.sh script, v1 basic auth middleware.js (env credentials, X-Robots-Tag), Deploying the tutorial prototype (v1), Vercel project playground-tutorial-prototype (Hoodies team), build.sh script, v2 basic auth middleware.js (env credentials, X-Robots-Tag, root redirect to /prototype/tutorial-v2/) (+3 more)

### Community 65 - "v2 Store Reducer (2)"
Cohesion: 0.15
Nodes (9): here, PORT, ROOT, DIST, errors, here, indexFile, server (+1 more)

### Community 66 - "Sidebar and Inputs"
Cohesion: 0.23
Nodes (8): DropdownMenu(), DropdownMenuContent(), DropdownMenuLabel(), DropdownMenuRadioGroup(), DropdownMenuRadioItem(), DropdownMenuTrigger(), FilterButton(), FilterMenu()

### Community 67 - "v2 Build History and Handoff (2)"
Cohesion: 0.21
Nodes (12): Sheet(), SheetContent(), SheetDescription(), SheetHeader(), SheetOverlay(), SheetPortal(), SheetTitle(), SheetTrigger() (+4 more)

### Community 68 - "Component Registry"
Cohesion: 0.15
Nodes (13): devDependencies, oxlint@^1.81.0, @tailwindcss/cli@^4.3.3, @types/node@^24.13.3, @types/react@^19.2.18, @types/react-dom@^19.2.7, typescript@~6.0.2, oxlint (+5 more)

### Community 69 - "Dialogs and Command Menu (2)"
Cohesion: 0.22
Nodes (12): ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartStyle(), ChartTooltipContent(), getPayloadConfigFromPayload() (+4 more)

### Community 70 - "v1 Desktop Nav and Glyphs (4)"
Cohesion: 0.37
Nodes (12): BarProps, columns(), CompactBar(), FullBar(), litCount(), quarter(), Segment(), StepBar() (+4 more)

### Community 71 - "v2 Thumbs and Card Types (2) (2)"
Cohesion: 0.20
Nodes (10): StatusDot(), statusDotVariants, Terminal(), TerminalCaret(), TerminalLine(), terminalLineVariants, --animate-caret (@theme), --animate-pulse-dot (@theme) (+2 more)

### Community 72 - "v2 Thumbs and Card Types (3)"
Cohesion: 0.33
Nodes (7): useStartedLessons(), Gallery(), NAV_ICONS, PhoneMenu(), Row(), soon(), TopBar()

### Community 73 - "Lessons and Principles (2)"
Cohesion: 0.26
Nodes (11): deployedArgs(), DISCRIMINATORS, Idl, IdlArg, IdlIx, idlLine(), idlOf(), idlShape() (+3 more)

### Community 74 - "Tailwind Theme and Code Views (2) (3)"
Cohesion: 0.18
Nodes (6): Principle: desktop is the reference, tablet and phone follow, config, config, Build 10/24 to 10/26 in spec section 15 order, Desktop is the reference; phone redesigned to follow it, Stand playground-tutorial-prototype-v2 behind basic auth

### Community 75 - "v2 Store Reducer (2) (2)"
Cohesion: 0.18
Nodes (7): here, OURS, plain, registry, specific, system, UI

### Community 76 - "v2 Stand Package"
Cohesion: 0.29
Nodes (10): Art, asked, BrandArt(), ReceiptArt(), reduced(), SHORT, StartHereArt(), StepsArt() (+2 more)

### Community 77 - "Stylesheet Entry and Runtime Deps"
Cohesion: 0.24
Nodes (8): shadcn@^4.21.0, tailwindcss@^4.3.3, tw-animate-css@^1.4.0, shadcn/ui, shadcn, tailwindcss, tw-animate-css, --font-text

### Community 78 - "v1 Desktop Nav and Glyphs (3)"
Cohesion: 0.33
Nodes (6): @tailwindcss/vite@^4.3.3, vite@^8.3.0, @vitejs/plugin-react@^6.1.1, @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 79 - "v2 Build History and Handoff (3)"
Cohesion: 0.27
Nodes (8): Alert(), AlertDescription(), AlertTitle(), alertVariants, Progress(), Feedback(), --color-card (@theme), --color-card-foreground (@theme)

### Community 80 - "Registry and Snapshot Scripts (2)"
Cohesion: 0.22
Nodes (9): scripts, build, build:inject, build:prototype, build:registry, dev, lint, preview (+1 more)

### Community 81 - "v2 Store Reducer (4)"
Cohesion: 0.25
Nodes (8): Diff(), DiffContent(), DiffFooter(), DiffHeader(), DiffLine(), diffLineVariants, DiffStat(), DiffTitle()

### Community 82 - "Select and Input Groups (2)"
Cohesion: 0.33
Nodes (4): Popover(), PopoverAnchor(), PopoverContent(), PopoverTrigger()

### Community 83 - "Buttons, Drawer, Questionnaire (2)"
Cohesion: 0.25
Nodes (5): GLYPH, ROW, Step, STEPS, NAV_ICONS

### Community 84 - "v2 Thumbs and Card Types (4)"
Cohesion: 0.33
Nodes (8): COARSE, FINE, isCoarse(), listeners, subscribeHints(), useCoarse(), useKeyHints(), watch()

### Community 85 - "Start Here Surface Styles"
Cohesion: 0.25
Nodes (6): BAYER, FIELD, --color-brand-green (@theme), --color-brand-violet (@theme), --brand-green, --brand-violet

### Community 86 - "Tailwind Theme and Code Views (3)"
Cohesion: 0.25
Nodes (6): BEDS, Field, FIELDS, Ground, GROUND_BY_FRAMEWORK, PLACES

### Community 87 - "Navigation Menu Blocks"
Cohesion: 0.32
Nodes (6): INITIAL_FILES, clientStep(), Entry, FileTreeList(), ROW, treeOf()

### Community 88 - "Start Here Surface Styles"
Cohesion: 0.25
Nodes (6): BEDS, Field, FIELDS, Ground, GROUND_BY_FRAMEWORK, PLACES

### Community 89 - "Code Blocks and Diagnostics (2) (2)"
Cohesion: 0.33
Nodes (6): dependencies, @vercel/functions@^3.10.2, @vercel/functions, name, private, type

### Community 90 - "Menubar, Pagination, Breadcrumb (3)"
Cohesion: 0.33
Nodes (6): dependencies, @vercel/functions@^3.10.2, @vercel/functions, name, private, type

### Community 91 - "Combobox (2)"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 92 - "Cards, Tables, Accordion (2)"
Cohesion: 0.53
Nodes (5): NEXT_TUTORIAL, DesktopBanner(), QuietAction(), StartHereBanner(), useBanner()

### Community 93 - "Composer and Setup List"
Cohesion: 0.67
Nodes (5): byWindow(), clamp(), Column(), store(), stored()

### Community 94 - "Runtime Dependencies (2)"
Cohesion: 0.40
Nodes (5): @shadcn/react@^0.3.1, message-scroller component, questionnaire component, @shadcn/react runtime package, @shadcn/react

### Community 95 - "Alert Dialog"
Cohesion: 0.40
Nodes (4): buildCommand, framework, outputDirectory, $schema

### Community 96 - "v2 Resizable Column"
Cohesion: 0.40
Nodes (4): buildCommand, framework, outputDirectory, $schema

### Community 97 - "v2 Vercel Config"
Cohesion: 0.40
Nodes (5): Faucet Seahorse thumbnail (seahorse at a water tap), Hello Anchor tutorial thumbnail, Anchor framework, Hello Seahorse tutorial thumbnail, Seahorse framework (Python for Solana)

### Community 98 - "v1 Vercel Config"
Cohesion: 0.40
Nodes (4): homepage, items, name, $schema

### Community 99 - "DS Site App Shell"
Cohesion: 0.40
Nodes (4): compilerOptions, paths, files, references

### Community 100 - "Menu Motion Tokens"
Cohesion: 0.50
Nodes (4): Step bar lab prototype entry (src/prototype/stepper-lab/main.tsx), Segmented component, Stepper component, use-indicator hook (measured sliding thumb)

### Community 102 - "Favicon"
Cohesion: 0.67
Nodes (3): Bank Simulator tutorial thumbnail, Clockwork (on-chain automation for interest returns), Expense Tracker tutorial thumbnail (on-chain CRUD, donut chart)

### Community 103 - "Battle Game Thumbs"
Cohesion: 1.00
Nodes (3): Seahorse (Python framework for Solana programs), TicTacToe Seahorse tutorial thumbnail (cartoon seahorse and crabs on tic tac toe sand board), Todo App Seahorse tutorial thumbnail (seahorse with TODO clipboard)

## Knowledge Gaps
- **82 isolated node(s):** `Counter PDA tutorial thumbnail (+1 on purple-teal gradient)`, `Lumberjack tutorial thumbnail (bearded lumberjack portrait)`, `combobox component (Base UI)`, `Still open: sign in, share link, model name, Home, New project, Programs, network failures`, `Real in the prototype: flow, states, copy, timings, keys, editor check, IDL form, layout` (+77 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 624 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Design Tokens (tokens.css)` to `Code Blocks and Diagnostics (2)`, `Chat Messages and Attachments (2)`, `v1 Code Check Tests`, `v2 Lesson Script Data`, `Tailwind Theme and Code Views`, `Composer and Setup List (4)`, `Console Drawer and Editor Tabs`, `v1 Code Check Tests (2)`, `Prototype v2 Stylesheet`, `v1 Desktop Nav and Glyphs (2)`, `v1 Code Check Tests (3)`, `shadcn Components Config`, `v1 Gallery Catalog`, `Merge Conflict UI`, `Composer and Setup List (2)`, `Select and Input Groups`, `Empty States and Async Button`, `Tailwind Theme and Code Views (2)`, `v1 Desktop Nav and Glyphs`, `Cards, Tables, Accordion`, `Cards, Tables, Accordion (2)`, `Prototype v2 Stylesheet (2)`, `v1 Code Check Tests (4)`, `DS Site App Shell (2)`, `Fields and Button Groups`, `v2 Thumbs and Card Types`, `v2 Canned Answers (2)`, `v2 Build History and Handoff`, `Code Blocks and Diagnostics (2) (2)`, `v2 Desktop Nav (4)`, `App TypeScript Config`, `v1 Tutorial Store and Data (2)`, `Chat Messages and Attachments`, `Design Tokens (tokens.css) (2)`, `v2 Iso Voxel Art`, `v2 Desktop Nav (3)`, `Buttons, Drawer, Questionnaire`, `v2 Thumbs and Card Types (2)`, `v2 Store Reducer`, `v2 Store Reducer (2)`, `Stylesheet Entry and Runtime Deps`, `Lessons and Principles`, `v2 Thumbs and Card Types (2) (2)`, `Menubar, Pagination, Breadcrumb (2)`, `v1 Desktop Nav and Glyphs (2) (2)`, `Tailwind Theme and Code Views (3)`, `Stylesheet Entry and Runtime Deps (2)`, `Tailwind Theme and Code Views (4)`, `Sidebar and Inputs`, `v2 Build History and Handoff (2)`, `Dialogs and Command Menu (2)`, `v1 Desktop Nav and Glyphs (4)`, `v2 Thumbs and Card Types (2) (2)`, `v2 Thumbs and Card Types (3)`, `v2 Stand Package`, `v2 Build History and Handoff (3)`, `v2 Store Reducer (4)`, `Select and Input Groups (2)`, `Buttons, Drawer, Questionnaire (2)`, `v2 Thumbs and Card Types (4)`, `Start Here Surface Styles`, `Navigation Menu Blocks`, `Cards, Tables, Accordion (2)`, `Composer and Setup List`?**
  _High betweenness centrality (0.247) - this node is a cross-community bridge._
- **What connects `Counter PDA tutorial thumbnail (+1 on purple-teal gradient)`, `Lumberjack tutorial thumbnail (bearded lumberjack portrait)`, `combobox component (Base UI)` to the rest of the system?**
  _82 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Design Tokens (tokens.css)` be split into smaller, more focused modules?**
  _Cohesion score 0.030713058419243985 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Chat Messages and Attachments` to `Design Tokens (tokens.css)`, `Code Blocks and Diagnostics (2)`, `Chat Messages and Attachments (2)`, `Design Tokens (tokens.css)`, `v1 Code Check Tests`, `v2 Lesson Script Data`, `Tailwind Theme and Code Views`, `Composer and Setup List (4)`, `Console Drawer and Editor Tabs`, `v1 Code Check Tests (2)`, `Prototype v2 Stylesheet`, `v1 Code Check Tests (3)`, `v1 Gallery Catalog`, `Merge Conflict UI`, `Composer and Setup List (2)`, `Select and Input Groups`, `Empty States and Async Button`, `Tailwind Theme and Code Views (2)`, `v1 Desktop Nav and Glyphs`, `Prototype v2 Stylesheet (2)`, `v1 Code Check Tests (4)`, `DS Site App Shell (2)`, `Fields and Button Groups`, `v2 Thumbs and Card Types`, `v2 Canned Answers (2)`, `v2 Desktop Nav (4)`, `App TypeScript Config`, `v1 Tutorial Store and Data (2)`, `Design Tokens (tokens.css) (2)`, `v2 Iso Voxel Art`, `v2 Desktop Nav (3)`, `v2 Thumbs and Card Types (2)`, `v2 Store Reducer`, `v2 Store Reducer (2)`, `Stylesheet Entry and Runtime Deps`, `Lessons and Principles`, `Menubar, Pagination, Breadcrumb (2)`, `v1 Desktop Nav and Glyphs (2) (2)`, `Tailwind Theme and Code Views (3)`, `Sidebar and Inputs`, `v2 Build History and Handoff (2)`, `v2 Thumbs and Card Types (3)`, `v2 Stand Package`, `Navigation Menu Blocks`, `Cards, Tables, Accordion (2)`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Should `Code Blocks and Diagnostics (2)` be split into smaller, more focused modules?**
  _Cohesion score 0.05955734406438632 - nodes in this community are weakly interconnected._
- **Why does `Tutorial prototype v2 guide (README)` connect `v2 Build History and Handoff` to `Lessons and Principles`, `Prototype v2 Stylesheet`, `Tailwind Theme and Code Views (2) (3)`, `v2 Store Reducer`, `v1 Code Check Tests (4)`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Should `Chat Messages and Attachments (2)` be split into smaller, more focused modules?**
  _Cohesion score 0.05625 - nodes in this community are weakly interconnected._