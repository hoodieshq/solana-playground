# Graph Report - design-system  (2026-10-27)

## Corpus Check
- 310 files · ~185,799 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 3 file(s) not represented in the graph (no extension)
- Styles: the 6 .css files (tokens.css included) come from a separate styles pass, since graphify has no CSS extractor; `uses_token` edges tie each .ts/.tsx file to the @theme variables and @utility classes its Tailwind classes resolve to

## Summary
- 2343 nodes · 8616 edges · 115 communities (89 shown, 26 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.85)
- Token cost: 276,231 input · 0 output

## Community Hubs (Navigation)
- v2 Thumbs and Card Types
- v2 Desktop Nav
- Cards, Tables, Accordion
- Select and Input Groups
- v1 Action Bar and Pointer
- Dialogs and Command Menu
- Code Blocks and Diagnostics
- Prototype v2 Stylesheet
- Tailwind Theme and Code Views
- Tailwind Theme and Code Views (2)
- Composer and Setup List
- Menubar, Pagination, Breadcrumb
- v2 Store Reducer
- v2 Build History and Handoff
- v1 Desktop Nav and Glyphs
- Tailwind Theme and Code Views
- Design Tokens (tokens.css) (2)
- v1 Tutorial Store and Data
- v1 Iso Voxel Art
- Merge Conflict UI
- Design Tokens (tokens.css)
- Stepper Lab and React Root
- v1 Gallery Catalog
- Runtime Dependencies
- v2 Receipt and Finish
- v2 Canned Answers
- v1 Desktop Nav and Glyphs (2)
- Chat Messages and Attachments
- v2 Lesson Script Data
- v2 Gallery and Tutorial List
- v2 Iso Voxel Art
- Buttons, Drawer, Questionnaire
- v1 Receipt and Program Id
- Navigation Menu Blocks
- v2 Keys and Block Insert
- Empty States and Async Button
- DS Site App Shell
- Sidebar and Inputs
- Registry and Snapshot Scripts
- Composer and Setup List (2)
- Achievements and Finish
- Design System Docs
- v2 Store Reducer (2)
- DS Site App Shell (2)
- Sheet and Phone Menu
- v1 Code Check Tests
- v2 Canned Answers (2)
- App TypeScript Config
- Fields and Button Groups
- Alert Dialog
- Buttons, Drawer, Questionnaire (2)
- Console Drawer and Editor Tabs
- shadcn Components Config
- Alert Dialog (2)
- Combobox
- Node TypeScript Config
- Stylesheet Entry and Runtime Deps
- v2 Keys and Block Insert (2)
- Carousel
- Dev Dependencies
- Stepper Lab and React Root (2)
- Chart
- v2 Lesson Script Data (2)
- Code Blocks and Diagnostics (2)
- Vite Build Tooling
- Package Scripts
- Composer and Setup List (3)
- Start Here Surface Styles
- v1 Desktop Nav and Glyphs (4)
- v2 Gallery and Tutorial List (2)
- v1 Stand Package
- v2 Stand Package
- Composer and Setup List (4)
- Cards, Tables, Accordion (2)
- Lint Config
- Achievements and Finish (2)
- v2 Resizable Column
- v2 Keys and Block Insert (3)
- Design System Docs (2)
- v2 Vercel Config
- v1 Vercel Config
- Anchor and Seahorse Thumbs
- Component Registry
- v1 Tutorial Store and Data (2)
- Root TypeScript Config
- Design System Docs (3)
- Menu Motion Tokens
- DS Site App Shell (2)
- Finance Tutorial Thumbs
- Seahorse Game Thumbs
- Favicon
- Battle Game Thumbs
- Hello Solana Thumb
- SPL Token Vault Thumb
- Tiny Adventure Thumbs
- Zero Copy Thumb
- Site Script
- Composer and Setup List (5)
- Design Tokens (tokens.css) (4)
- Design Tokens (tokens.css) (5)
- Design Tokens (tokens.css) (6)
- Design Tokens (tokens.css) (7)
- Design Tokens (tokens.css) (8)
- Design Tokens (tokens.css) (9)
- v2 Receipt and Finish (2)
- Design Tokens (tokens.css) (10)
- Design Tokens (tokens.css) (11)
- Design Tokens (tokens.css) (12)
- DS Site App Shell (3)
- Composer and Setup List (3)
- Counter PDA Thumb
- Lumberjack Thumb
- Combobox Rationale

## God Nodes (most connected - your core abstractions)
1. `react` - 177 edges
2. `--color-muted-foreground (@theme)` - 147 edges
3. `PlaygroundComponents()` - 138 edges
4. `--color-foreground (@theme)` - 138 edges
5. `Button()` - 114 edges
6. `--color-border (@theme)` - 105 edges
7. `lucide-react` - 93 edges
8. `cn` - 86 edges
9. `useStore()` - 76 edges
10. `--text-caption (@theme)` - 70 edges

## Surprising Connections (you probably didn't know these)
- `Tailwind 4` --references--> `tailwindcss`  [EXTRACTED]
  README.md → package.json
- `shadcn/ui` --references--> `shadcn`  [EXTRACTED]
  README.md → package.json
- `Step bar lab prototype entry (src/prototype/stepper-lab/main.tsx)` --conceptually_related_to--> `Stepper component`  [INFERRED]
  prototype/stepper-lab/index.html → README.md
- `ItemSeparator()` --calls--> `Separator()`  [EXTRACTED]
  src/components/ui/item.tsx → src/components/ui/separator.tsx
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

## Communities (115 total, 26 thin omitted)

### Community 0 - "v2 Thumbs and Card Types"
Cohesion: 0.06
Nodes (80): ActBeat, BEATS, Row, trimContext(), --card-ground, Turn, useStore(), Conversation() (+72 more)

### Community 1 - "v2 Desktop Nav"
Cohesion: 0.06
Nodes (64): AttachmentAction(), Button(), CopyButton(), HelpTip(), Kbd(), SidebarMenuButton(), Tooltip(), TooltipContent() (+56 more)

### Community 2 - "Cards, Tables, Accordion"
Cohesion: 0.06
Nodes (53): Accordion(), AccordionContent(), AccordionItem(), AccordionTrigger(), Avatar(), AvatarFallback(), AvatarGroup(), Card() (+45 more)

### Community 3 - "Select and Input Groups"
Cohesion: 0.11
Nodes (29): class-variance-authority, cn, radix-ui, react, BubbleReactions(), bubbleReactionsVariants, InputGroupTextarea(), MessageScrollerButton() (+21 more)

### Community 4 - "v1 Action Bar and Pointer"
Cohesion: 0.08
Nodes (45): NAME_MAX, STEPS, ActionBar(), Feed(), inFlight(), land(), Msg, Question() (+37 more)

### Community 5 - "Dialogs and Command Menu"
Cohesion: 0.08
Nodes (35): Command(), CommandDialog(), CommandEmpty(), CommandGroup(), CommandInput(), CommandItem(), CommandList(), CommandShortcut() (+27 more)

### Community 6 - "Code Blocks and Diagnostics"
Cohesion: 0.06
Nodes (46): DropZone(), DropZoneDescription(), DropZoneIcon(), DropZoneTitle(), MenuFold(), MenuFoldChevron(), MenuFoldContent(), MenuFoldTrigger() (+38 more)

### Community 7 - "Prototype v2 Stylesheet"
Cohesion: 0.04
Nodes (47): --safe-bottom, --tablet-safe-bottom, --tooth, --accent, --accent-fill-hover, --accent-foreground, --background, --border (+39 more)

### Community 8 - "Tailwind Theme and Code Views"
Cohesion: 0.13
Nodes (33): Popover(), PopoverAnchor(), PopoverContent(), PopoverTrigger(), EditorError, CLASS, CodeView(), hang() (+25 more)

### Community 9 - "Tailwind Theme and Code Views (2)"
Cohesion: 0.15
Nodes (24): Chip, Predict, reduce, typed, Add, HEADING, READ, READ_CODE (+16 more)

### Community 10 - "Composer and Setup List"
Cohesion: 0.07
Nodes (41): AchievementLabel(), BrandButtonIcon(), CalloutTitle(), ComposerAdd(), ComposerBanner(), ComposerChip(), ComposerContext, ComposerContextList() (+33 more)

### Community 11 - "Menubar, Pagination, Breadcrumb"
Cohesion: 0.06
Nodes (31): Breadcrumb(), BreadcrumbItem(), BreadcrumbLink(), BreadcrumbList(), BreadcrumbPage(), BreadcrumbSeparator(), Menubar(), MenubarContent() (+23 more)

### Community 12 - "v2 Store Reducer"
Cohesion: 0.09
Nodes (45): actionWord(), wordFits(), OwnCheck, diffLines(), actUp(), afterAct(), Body, checkBuild() (+37 more)

### Community 13 - "v2 Build History and Handoff"
Cohesion: 0.07
Nodes (36): Hello Anchor tutorial prototype v1 entry (src/prototype/tutorial/main.tsx), Hello Anchor tutorial prototype v2 entry (src/prototype/tutorial-v2/main.tsx), build.sh script, config, v1 basic auth middleware.js (env credentials, X-Robots-Tag), Deploying the tutorial prototype (v1), Vercel project playground-tutorial-prototype (Hoodies team), build.sh script (+28 more)

### Community 14 - "v1 Desktop Nav and Glyphs"
Cohesion: 0.09
Nodes (35): MergePaneTabs(), Segmented(), SegmentedItem(), segmentedItemVariants, segmentedVariants, DeviceFrame(), TABLET, useTabletScale() (+27 more)

### Community 15 - "Tailwind Theme and Code Views"
Cohesion: 0.05
Nodes (43): --animate-caret (@theme), --color-accent (@theme), --color-chart-4 (@theme), --color-info (@theme), --color-info-foreground (@theme), --color-sidebar-accent-foreground (@theme), --color-sidebar-primary-foreground (@theme), --color-sidebar-ring (@theme) (+35 more)

### Community 16 - "Design Tokens (tokens.css) (2)"
Cohesion: 0.05
Nodes (42): Colour(), Motion(), Type(), Section(), SwatchGrid(), TokenRow(), --color-brand-deep-green (@theme), --color-brand-periwinkle (@theme) (+34 more)

### Community 17 - "v1 Tutorial Store and Data"
Cohesion: 0.11
Nodes (39): BUILD_OK, BuildResult, callLog(), clientLog(), Fail, INITIAL_FILES, LessonBlock, LIB_NAMED (+31 more)

### Community 18 - "v1 Iso Voxel Art"
Cohesion: 0.08
Nodes (36): NEXT_TUTORIAL, BAYER, blend(), BRAND, buildMark(), buildScene(), CELL_SIZES, chroma() (+28 more)

### Community 19 - "Merge Conflict UI"
Cohesion: 0.08
Nodes (38): BAND, DELETED_NAME, HUNK_ACTION, hunkGroup(), Merge(), MergeBand, MergeContext, MergeCount() (+30 more)

### Community 20 - "Design Tokens (tokens.css)"
Cohesion: 0.05
Nodes (38): --color-brand-ink (@theme), --color-error-foreground (@theme), --color-sidebar (@theme), --color-sidebar-foreground (@theme), --color-sidebar-primary (@theme), --color-warning-foreground (@theme), --shadow-composer (@theme), --shadow-modal (@theme) (+30 more)

### Community 21 - "Stepper Lab and React Root"
Cohesion: 0.13
Nodes (30): Switch(), TodayBar(), TodayGlyph(), TodayPhoneTrack(), RunnerUpBar(), ChatMock(), DECISION, LINES (+22 more)

### Community 22 - "v1 Gallery Catalog"
Cohesion: 0.12
Nodes (33): TutorialCard, TUTORIALS, Gallery(), PATTERN, TutorialsBody(), Card(), TutorialLevels(), About (+25 more)

### Community 23 - "Runtime Dependencies"
Cohesion: 0.07
Nodes (35): dependencies, @base-ui/react@^1.8.0, class-variance-authority@^0.7.1, cmdk@^1.1.1, cn@^0.4.0, date-fns@^4.4.0, embla-carousel-react@^8.6.0, @fontsource-variable/geist@^5.3.0 (+27 more)

### Community 24 - "v2 Receipt and Finish"
Cohesion: 0.12
Nodes (30): Achievement(), AchievementMedia(), NEXT_TUTORIAL, PROGRAM_ID, shortKey(), TX_CONFIRMED, TX_FEE, openExplorer() (+22 more)

### Community 25 - "v2 Canned Answers"
Cohesion: 0.12
Nodes (27): Composer(), ComposerInput(), ComposerSend(), ComposerToolbar(), DropdownMenu(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel() (+19 more)

### Community 26 - "v1 Desktop Nav and Glyphs (2)"
Cohesion: 0.10
Nodes (29): bus, FLASH_MS, flashKeys(), useFlash(), Avatar(), ClusterDot(), Nav(), OPEN_ONLY (+21 more)

### Community 27 - "Chat Messages and Attachments"
Cohesion: 0.08
Nodes (26): Alert(), AlertDescription(), AlertTitle(), alertVariants, Attachment(), AttachmentContent(), AttachmentDescription(), AttachmentMedia() (+18 more)

### Community 28 - "v2 Lesson Script Data"
Cohesion: 0.07
Nodes (31): Ask, Beat, BUILD_OK, BuildResult, callLog(), CLIENT, CLIENT_CALL, clientLog() (+23 more)

### Community 29 - "v2 Gallery and Tutorial List"
Cohesion: 0.11
Nodes (31): TutorialCard, TUTORIALS, Gallery(), LAYER, LitGround(), SearchGlyph(), tiles(), TutorialsBody() (+23 more)

### Community 30 - "v2 Iso Voxel Art"
Cohesion: 0.09
Nodes (31): BAYER, blend(), BRAND, buildMark(), buildScene(), CELL_SIZES, chroma(), clamp01() (+23 more)

### Community 31 - "Buttons, Drawer, Questionnaire"
Cohesion: 0.21
Nodes (24): Drawer(), DrawerContent(), DrawerDescription(), DrawerFooter(), DrawerHeader(), DrawerOverlay(), DrawerPortal(), DrawerTitle() (+16 more)

### Community 32 - "v1 Receipt and Program Id"
Cohesion: 0.15
Nodes (26): sonner, PROGRAM_ID, shortKey(), TerminalBody(), OutputPane(), StepScreen(), arriving(), BuildLog() (+18 more)

### Community 33 - "Navigation Menu Blocks"
Cohesion: 0.12
Nodes (25): AspectRatio(), ComboboxContent(), ComboboxEmpty(), ComboboxItem(), ComboboxList(), NavigationMenu(), NavigationMenuContent(), NavigationMenuItem() (+17 more)

### Community 34 - "v2 Keys and Block Insert"
Cohesion: 0.13
Nodes (25): Editor(), bus, FLASH_MS, flashKeys(), enterFor(), FILES_KEYS, mac, MENU_KEYS (+17 more)

### Community 35 - "Empty States and Async Button"
Cohesion: 0.14
Nodes (25): AsyncButton(), Empty(), EmptyDescription(), EmptyHeader(), EmptyMedia(), emptyMediaVariants, EmptyTitle(), Spinner() (+17 more)

### Community 36 - "DS Site App Shell"
Cohesion: 0.11
Nodes (22): ONLY, OURS, Row, STATE_LABEL, STOCK, InstallLine(), Source, SOURCE_LABEL (+14 more)

### Community 37 - "Sidebar and Inputs"
Cohesion: 0.10
Nodes (16): Input(), SidebarContext, SidebarContextProps, SidebarInput(), sidebarMenuButtonVariants, SidebarMenuSkeleton(), SidebarProvider(), SidebarRail() (+8 more)

### Community 38 - "Registry and Snapshot Scripts"
Cohesion: 0.09
Nodes (16): here, PORT, ROOT, DIST, errors, here, indexFile, server (+8 more)

### Community 39 - "Composer and Setup List (2)"
Cohesion: 0.10
Nodes (24): ActionCard(), ActionCardAction(), ActionCardContent(), ActionCardDescription(), ActionCardEyebrow(), ActionCardLink(), ActionCardMedia(), ActionCardTitle() (+16 more)

### Community 40 - "Achievements and Finish"
Cohesion: 0.23
Nodes (19): Toaster(), TooltipProvider(), App(), DesktopApp(), useKeyboardRoom(), Finish(), Finish(), useStore() (+11 more)

### Community 41 - "Design System Docs"
Cohesion: 0.12
Nodes (20): Design system page HTML entry (src/main.tsx), ds-theme localStorage light/dark bootstrap script, client-v2 (consumer app), src/components/ui (60 stock shadcn + 27 own), yarn ds-add (one-step install into client-v2), ds-inject.css, src/ds design system page (foundations, component blocks, migration map), solana-playground-ds.vercel.app (DS page + product + Studio) (+12 more)

### Community 42 - "v2 Store Reducer (2)"
Cohesion: 0.23
Nodes (22): checkOwn(), fixOf(), helloSays(), holds(), insertBlock(), lineOf(), lines(), loose() (+14 more)

### Community 43 - "DS Site App Shell (2)"
Cohesion: 0.16
Nodes (19): App(), Fact(), Nav(), NavEntry, NavGroup, readTheme(), useCurrent(), useNav() (+11 more)

### Community 44 - "Sheet and Phone Menu"
Cohesion: 0.18
Nodes (16): Sheet(), SheetContent(), SheetDescription(), SheetHeader(), SheetOverlay(), SheetPortal(), SheetTitle(), SheetTrigger() (+8 more)

### Community 45 - "v1 Code Check Tests"
Cohesion: 0.20
Nodes (17): checkOwn(), helloSays(), holds(), insertBlock(), lineOf(), lines(), msgLine(), norm() (+9 more)

### Community 46 - "v2 Canned Answers (2)"
Cohesion: 0.10
Nodes (20): Answer, answerFor(), CHANGE_CHIP, CHANGE_TEXT, Context, EXPLAIN_STEP, FALLBACK, FALLBACK_NO_ASK (+12 more)

### Community 47 - "App TypeScript Config"
Cohesion: 0.10
Nodes (20): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+12 more)

### Community 48 - "Fields and Button Groups"
Cohesion: 0.14
Nodes (10): ButtonGroup(), ButtonGroupSeparator(), buttonGroupVariants, Field(), FieldLabel(), FieldSeparator(), fieldVariants, Label() (+2 more)

### Community 49 - "Alert Dialog"
Cohesion: 0.26
Nodes (15): BrandButton(), brandButtonVariants, ObjectiveMeter(), thumb(), byWindow(), clamp(), Column(), store() (+7 more)

### Community 50 - "Buttons, Drawer, Questionnaire (2)"
Cohesion: 0.13
Nodes (7): buttonVariants, Calendar(), CalendarDayButton(), QuestionnaireNext(), QuestionnairePrevious(), QuestionnaireSkip(), QuestionnaireSubmit()

### Community 51 - "Console Drawer and Editor Tabs"
Cohesion: 0.22
Nodes (16): ConsoleDrawer(), ConsoleDrawerActions(), ConsoleDrawerBar(), ConsoleDrawerContent(), ConsoleDrawerContext, ConsoleDrawerStatus(), Ctx, EditorTab() (+8 more)

### Community 52 - "shadcn Components Config"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+8 more)

### Community 53 - "Alert Dialog (2)"
Cohesion: 0.37
Nodes (13): AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay() (+5 more)

### Community 54 - "Combobox"
Cohesion: 0.15
Nodes (8): ComboboxChip(), ComboboxClear(), ComboboxInput(), ComboboxTrigger(), InputGroupButton(), inputGroupButtonVariants, --color-accent-foreground (@theme), --accent-foreground

### Community 55 - "Node TypeScript Config"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 56 - "Stylesheet Entry and Runtime Deps"
Cohesion: 0.14
Nodes (14): tailwind, baseColor, config, css, cssVariables, prefix, shadcn@^4.21.0, tailwindcss@^4.3.3 (+6 more)

### Community 57 - "v2 Keys and Block Insert (2)"
Cohesion: 0.18
Nodes (11): lucide-react, StepperStatus, command(), lastResult(), ResultTurn, TerminalBody(), BuildLog(), said() (+3 more)

### Community 58 - "Carousel"
Cohesion: 0.21
Nodes (14): Carousel(), CarouselApi, CarouselContent(), CarouselContext, CarouselContextProps, CarouselItem(), CarouselNext(), CarouselOptions (+6 more)

### Community 59 - "Dev Dependencies"
Cohesion: 0.14
Nodes (14): devDependencies, oxlint@^1.81.0, @tailwindcss/cli@^4.3.3, @types/node@^24.13.3, @types/react@^19.2.18, @types/react-dom@^19.2.7, typescript@~6.0.2, @vitejs/plugin-react@^6.1.1 (+6 more)

### Community 60 - "Stepper Lab and React Root (2)"
Cohesion: 0.32
Nodes (12): BarProps, CompactBar(), FullBar(), litCount(), quarter(), Segment(), StepBar(), StepTrack() (+4 more)

### Community 61 - "Chart"
Cohesion: 0.22
Nodes (12): ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartStyle(), ChartTooltipContent(), getPayloadConfigFromPayload() (+4 more)

### Community 62 - "v2 Lesson Script Data (2)"
Cohesion: 0.27
Nodes (10): NAMED_TX_SIGNATURE, Tx, TX_SIGNATURE, clientTx(), lastTx(), namedTx(), onDevnet(), stepTx() (+2 more)

### Community 63 - "Code Blocks and Diagnostics (2)"
Cohesion: 0.20
Nodes (8): StageEmpty(), StageEmptyActions(), StageEmptyDescription(), StageEmptyFooter(), StageEmptyMedia(), StageEmptyMeta(), StageEmptyTitle(), --font-weight-headline (@theme)

### Community 64 - "Vite Build Tooling"
Cohesion: 0.39
Nodes (5): @tailwindcss/vite@^4.3.3, vite@^8.3.0, @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 65 - "Package Scripts"
Cohesion: 0.22
Nodes (9): scripts, build, build:inject, build:prototype, build:registry, dev, lint, preview (+1 more)

### Community 66 - "Composer and Setup List (3)"
Cohesion: 0.25
Nodes (8): Diff(), DiffContent(), DiffFooter(), DiffHeader(), DiffLine(), diffLineVariants, DiffStat(), DiffTitle()

### Community 67 - "Start Here Surface Styles"
Cohesion: 0.22
Nodes (7): BAYER, FIELD, --color-brand-green (@theme), --color-brand-violet (@theme), --brand-green, --brand-purple, --brand-violet

### Community 68 - "v1 Desktop Nav and Glyphs (4)"
Cohesion: 0.25
Nodes (6): BEDS, Field, FIELDS, Ground, GROUND_BY_FRAMEWORK, PLACES

### Community 69 - "v2 Gallery and Tutorial List (2)"
Cohesion: 0.25
Nodes (6): BEDS, Field, FIELDS, Ground, GROUND_BY_FRAMEWORK, PLACES

### Community 70 - "v1 Stand Package"
Cohesion: 0.33
Nodes (6): dependencies, @vercel/functions@^3.10.2, @vercel/functions, name, private, type

### Community 71 - "v2 Stand Package"
Cohesion: 0.33
Nodes (6): dependencies, @vercel/functions@^3.10.2, @vercel/functions, name, private, type

### Community 72 - "Composer and Setup List (4)"
Cohesion: 0.29
Nodes (6): CodeBlock(), CodeBlockActions(), CodeBlockContent(), CodeBlockHeader(), CodeBlockLine(), CodeBlockTitle()

### Community 73 - "Cards, Tables, Accordion (2)"
Cohesion: 0.33
Nodes (7): KbdGroup(), ToggleGroup(), ToggleGroupItem(), Toggle(), toggleVariants, More(), Actions()

### Community 74 - "Lint Config"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 75 - "Achievements and Finish (2)"
Cohesion: 0.40
Nodes (6): BrandArt(), ReceiptArt(), reduced(), StartHereArt(), StepsArt(), useSweep()

### Community 76 - "v2 Resizable Column"
Cohesion: 0.67
Nodes (5): byWindow(), clamp(), Column(), store(), stored()

### Community 77 - "v2 Keys and Block Insert (3)"
Cohesion: 0.47
Nodes (5): pace(), Runner(), Action, stageMs(), One store for desktop and phone: the thread is the lesson

### Community 78 - "Design System Docs (2)"
Cohesion: 0.40
Nodes (5): @shadcn/react@^0.3.1, message-scroller component, questionnaire component, @shadcn/react runtime package, @shadcn/react

### Community 79 - "v2 Vercel Config"
Cohesion: 0.40
Nodes (4): buildCommand, framework, outputDirectory, $schema

### Community 80 - "v1 Vercel Config"
Cohesion: 0.40
Nodes (4): buildCommand, framework, outputDirectory, $schema

### Community 81 - "Anchor and Seahorse Thumbs"
Cohesion: 0.40
Nodes (5): Faucet Seahorse thumbnail (seahorse at a water tap), Hello Anchor tutorial thumbnail, Anchor framework, Hello Seahorse tutorial thumbnail, Seahorse framework (Python for Solana)

### Community 82 - "Component Registry"
Cohesion: 0.40
Nodes (4): homepage, items, name, $schema

### Community 84 - "Root TypeScript Config"
Cohesion: 0.40
Nodes (4): compilerOptions, paths, files, references

### Community 85 - "Design System Docs (3)"
Cohesion: 0.50
Nodes (4): Step bar lab prototype entry (src/prototype/stepper-lab/main.tsx), Segmented component, Stepper component, use-indicator hook (measured sliding thumb)

### Community 86 - "Menu Motion Tokens"
Cohesion: 0.50
Nodes (4): --animate-menu-in (@theme), --ease-menu (@theme), --duration-menu, --ease-menu-value

### Community 87 - "DS Site App Shell (2)"
Cohesion: 0.50
Nodes (4): .bg-gradient-product (@utility), .brand-action (@utility), --gradient-product, --surface-hover

### Community 88 - "Finance Tutorial Thumbs"
Cohesion: 0.67
Nodes (3): Bank Simulator tutorial thumbnail, Clockwork (on-chain automation for interest returns), Expense Tracker tutorial thumbnail (on-chain CRUD, donut chart)

### Community 89 - "Seahorse Game Thumbs"
Cohesion: 1.00
Nodes (3): Seahorse (Python framework for Solana programs), TicTacToe Seahorse tutorial thumbnail (cartoon seahorse and crabs on tic tac toe sand board), Todo App Seahorse tutorial thumbnail (seahorse with TODO clipboard)

## Knowledge Gaps
- **81 isolated node(s):** `Counter PDA tutorial thumbnail (+1 on purple-teal gradient)`, `Lumberjack tutorial thumbnail (bearded lumberjack portrait)`, `combobox component (Base UI)`, `solana-playground-ds.vercel.app (DS page + product + Studio)`, `Studio picking by data-slot / data-variant / data-size / data-status` (+76 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 584 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Select and Input Groups` to `v2 Thumbs and Card Types`, `v2 Desktop Nav`, `Cards, Tables, Accordion`, `v1 Action Bar and Pointer`, `Dialogs and Command Menu`, `Code Blocks and Diagnostics`, `Tailwind Theme and Code Views`, `Tailwind Theme and Code Views (2)`, `Composer and Setup List`, `Menubar, Pagination, Breadcrumb`, `v2 Store Reducer`, `v1 Desktop Nav and Glyphs`, `v1 Tutorial Store and Data`, `v1 Iso Voxel Art`, `Merge Conflict UI`, `Stepper Lab and React Root`, `v1 Gallery Catalog`, `Runtime Dependencies`, `v2 Receipt and Finish`, `v2 Canned Answers`, `v1 Desktop Nav and Glyphs (2)`, `Chat Messages and Attachments`, `v2 Lesson Script Data`, `v2 Gallery and Tutorial List`, `v2 Iso Voxel Art`, `Buttons, Drawer, Questionnaire`, `v1 Receipt and Program Id`, `Navigation Menu Blocks`, `v2 Keys and Block Insert`, `Empty States and Async Button`, `DS Site App Shell`, `Sidebar and Inputs`, `Composer and Setup List (2)`, `Achievements and Finish`, `DS Site App Shell (2)`, `Sheet and Phone Menu`, `Fields and Button Groups`, `Alert Dialog`, `Buttons, Drawer, Questionnaire (2)`, `Console Drawer and Editor Tabs`, `Alert Dialog (2)`, `Combobox`, `v2 Keys and Block Insert (2)`, `Carousel`, `Stepper Lab and React Root (2)`, `Chart`, `Code Blocks and Diagnostics (2)`, `Composer and Setup List (3)`, `Start Here Surface Styles`, `Composer and Setup List (4)`, `v2 Resizable Column`, `v2 Keys and Block Insert (3)`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **What connects `Counter PDA tutorial thumbnail (+1 on purple-teal gradient)`, `Lumberjack tutorial thumbnail (bearded lumberjack portrait)`, `combobox component (Base UI)` to the rest of the system?**
  _81 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `v2 Thumbs and Card Types` be split into smaller, more focused modules?**
  _Cohesion score 0.057647801388596674 - nodes in this community are weakly interconnected._
- **Why does `--color-muted-foreground (@theme)` connect `Tailwind Theme and Code Views (2)` to `v2 Thumbs and Card Types`, `v2 Desktop Nav`, `Cards, Tables, Accordion`, `Select and Input Groups`, `v1 Action Bar and Pointer`, `Dialogs and Command Menu`, `Code Blocks and Diagnostics`, `Prototype v2 Stylesheet`, `Tailwind Theme and Code Views`, `Composer and Setup List`, `Menubar, Pagination, Breadcrumb`, `v1 Desktop Nav and Glyphs`, `Tailwind Theme and Code Views`, `Design Tokens (tokens.css) (2)`, `v1 Iso Voxel Art`, `Merge Conflict UI`, `Stepper Lab and React Root`, `v1 Gallery Catalog`, `v2 Receipt and Finish`, `v2 Canned Answers`, `v1 Desktop Nav and Glyphs (2)`, `Chat Messages and Attachments`, `v2 Lesson Script Data`, `v2 Gallery and Tutorial List`, `Buttons, Drawer, Questionnaire`, `v1 Receipt and Program Id`, `Navigation Menu Blocks`, `Empty States and Async Button`, `DS Site App Shell`, `Composer and Setup List (2)`, `Achievements and Finish`, `DS Site App Shell (2)`, `Sheet and Phone Menu`, `Fields and Button Groups`, `Alert Dialog`, `Buttons, Drawer, Questionnaire (2)`, `Console Drawer and Editor Tabs`, `Alert Dialog (2)`, `Combobox`, `v2 Keys and Block Insert (2)`, `Stepper Lab and React Root (2)`, `Chart`, `Code Blocks and Diagnostics (2)`, `Composer and Setup List (3)`, `Composer and Setup List (4)`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Should `v2 Desktop Nav` be split into smaller, more focused modules?**
  _Cohesion score 0.0644384221619994 - nodes in this community are weakly interconnected._
- **Why does `--color-foreground (@theme)` connect `Tailwind Theme and Code Views (2)` to `v2 Thumbs and Card Types`, `v2 Desktop Nav`, `Cards, Tables, Accordion`, `Select and Input Groups`, `v1 Action Bar and Pointer`, `Dialogs and Command Menu`, `Code Blocks and Diagnostics`, `Tailwind Theme and Code Views`, `Composer and Setup List`, `Menubar, Pagination, Breadcrumb`, `v1 Desktop Nav and Glyphs`, `Tailwind Theme and Code Views`, `v1 Iso Voxel Art`, `Merge Conflict UI`, `Stepper Lab and React Root`, `v1 Gallery Catalog`, `v2 Receipt and Finish`, `v2 Canned Answers`, `v1 Desktop Nav and Glyphs (2)`, `Chat Messages and Attachments`, `v2 Lesson Script Data`, `v2 Gallery and Tutorial List`, `Buttons, Drawer, Questionnaire`, `v1 Receipt and Program Id`, `Navigation Menu Blocks`, `Empty States and Async Button`, `DS Site App Shell`, `Composer and Setup List (2)`, `Achievements and Finish`, `DS Site App Shell (2)`, `Sheet and Phone Menu`, `Alert Dialog`, `Console Drawer and Editor Tabs`, `Alert Dialog (2)`, `Combobox`, `v2 Keys and Block Insert (2)`, `Stepper Lab and React Root (2)`, `Chart`, `Code Blocks and Diagnostics (2)`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Should `Cards, Tables, Accordion` be split into smaller, more focused modules?**
  _Cohesion score 0.05898021308980213 - nodes in this community are weakly interconnected._