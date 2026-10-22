/* ── Studio, set up for Solana Playground ─────────────────────────────────
   The toolkit is ~/Studio and carries no product. This file is the product.
   It is generated: scripts/studio-config.mjs fills in the component map from
   the design system's own data-slot names, so edit this template, not the
   copy under /studio/ on the site. */

/* The product is dark, and the system's tokens follow the class, as
   shadcn's do. The design system page keeps its own switch. */
if (!/^\/design-system/.test(location.pathname)) document.documentElement.classList.add('dark');

window.StudioConfig = {
  name: 'Playground Studio',
  colours: { accent: '#9945FF', ok: '#14F195', alt: '#38BDF8' },
  font: "'Stack Sans Text','Inter',ui-sans-serif,system-ui,-apple-system,sans-serif",

  home: '/design-system/',
  homeLabel: 'Design system',

  views: [
    { group: 'App', items: [
      { label: 'Playground', href: '/#app', note: 'The product, client-v2 as it is today', kind: 'app' },
      { label: 'Design system', href: '/design-system/', note: 'shadcn and ours, in Playground tokens', kind: 'app' },
      { label: 'Proposal deck', href: '/', note: 'The redesign, told in slides', kind: 'app' },
      { label: 'Roadmap', href: '/#roadmap', note: 'Q4 and Breakpoint', kind: 'app' }
    ]},
    { group: 'Landing', items: [
      { label: 'Landing', href: '/#landing', note: 'The page in progress', kind: 'landing' }
    ]},
    { group: 'Archive', items: [] }
  ],

  /* First the system's own parts, by the data-slot every one of them
     carries, variants before the plain part since the first match wins.
     Then client-v2 as it is today, by ids and labels, for what has not
     moved yet. */
  components: [
    {
      "name": "Action card, frame · Playground",
      "sel": "[data-slot=\"action-card\"][data-variant=\"frame\"]"
    },
    {
      "name": "Alert, destructive",
      "sel": "[data-slot=\"alert\"][data-variant=\"destructive\"]"
    },
    {
      "name": "Attachment, icon",
      "sel": "[data-slot=\"attachment\"][data-variant=\"icon\"]"
    },
    {
      "name": "Attachment, image",
      "sel": "[data-slot=\"attachment\"][data-variant=\"image\"]"
    },
    {
      "name": "Attachment media, icon",
      "sel": "[data-slot=\"attachment-media\"][data-variant=\"icon\"]"
    },
    {
      "name": "Attachment media, image",
      "sel": "[data-slot=\"attachment-media\"][data-variant=\"image\"]"
    },
    {
      "name": "Badge, secondary",
      "sel": "[data-slot=\"badge\"][data-variant=\"secondary\"]"
    },
    {
      "name": "Badge, destructive",
      "sel": "[data-slot=\"badge\"][data-variant=\"destructive\"]"
    },
    {
      "name": "Badge, outline",
      "sel": "[data-slot=\"badge\"][data-variant=\"outline\"]"
    },
    {
      "name": "Badge, ghost",
      "sel": "[data-slot=\"badge\"][data-variant=\"ghost\"]"
    },
    {
      "name": "Badge, link",
      "sel": "[data-slot=\"badge\"][data-variant=\"link\"]"
    },
    {
      "name": "Brand button, ring · Playground",
      "sel": "[data-slot=\"brand-button\"][data-variant=\"ring\"]"
    },
    {
      "name": "Brand button, accent · Playground",
      "sel": "[data-slot=\"brand-button\"][data-variant=\"accent\"]"
    },
    {
      "name": "Bubble, secondary",
      "sel": "[data-slot=\"bubble\"][data-variant=\"secondary\"]"
    },
    {
      "name": "Bubble, muted",
      "sel": "[data-slot=\"bubble\"][data-variant=\"muted\"]"
    },
    {
      "name": "Bubble, tinted",
      "sel": "[data-slot=\"bubble\"][data-variant=\"tinted\"]"
    },
    {
      "name": "Bubble, outline",
      "sel": "[data-slot=\"bubble\"][data-variant=\"outline\"]"
    },
    {
      "name": "Bubble, ghost",
      "sel": "[data-slot=\"bubble\"][data-variant=\"ghost\"]"
    },
    {
      "name": "Bubble, destructive",
      "sel": "[data-slot=\"bubble\"][data-variant=\"destructive\"]"
    },
    {
      "name": "Button, outline",
      "sel": "[data-slot=\"button\"][data-variant=\"outline\"]"
    },
    {
      "name": "Button, secondary",
      "sel": "[data-slot=\"button\"][data-variant=\"secondary\"]"
    },
    {
      "name": "Button, ghost",
      "sel": "[data-slot=\"button\"][data-variant=\"ghost\"]"
    },
    {
      "name": "Button, destructive",
      "sel": "[data-slot=\"button\"][data-variant=\"destructive\"]"
    },
    {
      "name": "Button, link",
      "sel": "[data-slot=\"button\"][data-variant=\"link\"]"
    },
    {
      "name": "Callout, info · Playground",
      "sel": "[data-slot=\"callout\"][data-variant=\"info\"]"
    },
    {
      "name": "Callout, warning · Playground",
      "sel": "[data-slot=\"callout\"][data-variant=\"warning\"]"
    },
    {
      "name": "Callout, success · Playground",
      "sel": "[data-slot=\"callout\"][data-variant=\"success\"]"
    },
    {
      "name": "Callout, error · Playground",
      "sel": "[data-slot=\"callout\"][data-variant=\"error\"]"
    },
    {
      "name": "Diff line, context · Playground",
      "sel": "[data-slot=\"diff-line\"][data-variant=\"context\"]"
    },
    {
      "name": "Diff line, added · Playground",
      "sel": "[data-slot=\"diff-line\"][data-variant=\"added\"]"
    },
    {
      "name": "Diff line, removed · Playground",
      "sel": "[data-slot=\"diff-line\"][data-variant=\"removed\"]"
    },
    {
      "name": "Empty icon, icon",
      "sel": "[data-slot=\"empty-icon\"][data-variant=\"icon\"]"
    },
    {
      "name": "Item, outline",
      "sel": "[data-slot=\"item\"][data-variant=\"outline\"]"
    },
    {
      "name": "Item, muted",
      "sel": "[data-slot=\"item\"][data-variant=\"muted\"]"
    },
    {
      "name": "Item media, icon",
      "sel": "[data-slot=\"item-media\"][data-variant=\"icon\"]"
    },
    {
      "name": "Item media, image",
      "sel": "[data-slot=\"item-media\"][data-variant=\"image\"]"
    },
    {
      "name": "Marker, separator",
      "sel": "[data-slot=\"marker\"][data-variant=\"separator\"]"
    },
    {
      "name": "Marker, border",
      "sel": "[data-slot=\"marker\"][data-variant=\"border\"]"
    },
    {
      "name": "Segmented, thumb · Playground",
      "sel": "[data-slot=\"segmented\"][data-variant=\"thumb\"]"
    },
    {
      "name": "Segmented, boxed · Playground",
      "sel": "[data-slot=\"segmented\"][data-variant=\"boxed\"]"
    },
    {
      "name": "Segmented, gradient · Playground",
      "sel": "[data-slot=\"segmented\"][data-variant=\"gradient\"]"
    },
    {
      "name": "Segmented, chips · Playground",
      "sel": "[data-slot=\"segmented\"][data-variant=\"chips\"]"
    },
    {
      "name": "Segmented item, thumb · Playground",
      "sel": "[data-slot=\"segmented-item\"][data-variant=\"thumb\"]"
    },
    {
      "name": "Segmented item, boxed · Playground",
      "sel": "[data-slot=\"segmented-item\"][data-variant=\"boxed\"]"
    },
    {
      "name": "Segmented item, gradient · Playground",
      "sel": "[data-slot=\"segmented-item\"][data-variant=\"gradient\"]"
    },
    {
      "name": "Segmented item, chips · Playground",
      "sel": "[data-slot=\"segmented-item\"][data-variant=\"chips\"]"
    },
    {
      "name": "Setup list item, todo · Playground",
      "sel": "[data-slot=\"setup-list-item\"][data-status=\"todo\"]"
    },
    {
      "name": "Setup list item, done · Playground",
      "sel": "[data-slot=\"setup-list-item\"][data-status=\"done\"]"
    },
    {
      "name": "Setup list item, warn · Playground",
      "sel": "[data-slot=\"setup-list-item\"][data-status=\"warn\"]"
    },
    {
      "name": "Sidebar menu button, outline",
      "sel": "[data-slot=\"sidebar-menu-button\"][data-variant=\"outline\"]"
    },
    {
      "name": "Status dot, idle · Playground",
      "sel": "[data-slot=\"status-dot\"][data-variant=\"idle\"]"
    },
    {
      "name": "Status dot, success · Playground",
      "sel": "[data-slot=\"status-dot\"][data-variant=\"success\"]"
    },
    {
      "name": "Status dot, warning · Playground",
      "sel": "[data-slot=\"status-dot\"][data-variant=\"warning\"]"
    },
    {
      "name": "Status dot, error · Playground",
      "sel": "[data-slot=\"status-dot\"][data-variant=\"error\"]"
    },
    {
      "name": "Status dot, info · Playground",
      "sel": "[data-slot=\"status-dot\"][data-variant=\"info\"]"
    },
    {
      "name": "Status dot, running · Playground",
      "sel": "[data-slot=\"status-dot\"][data-variant=\"running\"]"
    },
    {
      "name": "Status dot, target · Playground",
      "sel": "[data-slot=\"status-dot\"][data-variant=\"target\"]"
    },
    {
      "name": "Step rail item, done · Playground",
      "sel": "[data-slot=\"step-rail-item\"][data-status=\"done\"]"
    },
    {
      "name": "Step rail item, skipped · Playground",
      "sel": "[data-slot=\"step-rail-item\"][data-status=\"skipped\"]"
    },
    {
      "name": "Step rail item, current · Playground",
      "sel": "[data-slot=\"step-rail-item\"][data-status=\"current\"]"
    },
    {
      "name": "Step rail item, locked · Playground",
      "sel": "[data-slot=\"step-rail-item\"][data-status=\"locked\"]"
    },
    {
      "name": "Stepper item, idle · Playground",
      "sel": "[data-slot=\"stepper-item\"][data-status=\"idle\"]"
    },
    {
      "name": "Stepper item, done · Playground",
      "sel": "[data-slot=\"stepper-item\"][data-status=\"done\"]"
    },
    {
      "name": "Stepper item, running · Playground",
      "sel": "[data-slot=\"stepper-item\"][data-status=\"running\"]"
    },
    {
      "name": "Stepper item, failed · Playground",
      "sel": "[data-slot=\"stepper-item\"][data-status=\"failed\"]"
    },
    {
      "name": "Tabs list, line",
      "sel": "[data-slot=\"tabs-list\"][data-variant=\"line\"]"
    },
    {
      "name": "Tag, neutral · Playground",
      "sel": "[data-slot=\"tag\"][data-variant=\"neutral\"]"
    },
    {
      "name": "Tag, success · Playground",
      "sel": "[data-slot=\"tag\"][data-variant=\"success\"]"
    },
    {
      "name": "Tag, warning · Playground",
      "sel": "[data-slot=\"tag\"][data-variant=\"warning\"]"
    },
    {
      "name": "Tag, info · Playground",
      "sel": "[data-slot=\"tag\"][data-variant=\"info\"]"
    },
    {
      "name": "Tag, error · Playground",
      "sel": "[data-slot=\"tag\"][data-variant=\"error\"]"
    },
    {
      "name": "Tag, brand · Playground",
      "sel": "[data-slot=\"tag\"][data-variant=\"brand\"]"
    },
    {
      "name": "Terminal line, output · Playground",
      "sel": "[data-slot=\"terminal-line\"][data-variant=\"output\"]"
    },
    {
      "name": "Terminal line, prompt · Playground",
      "sel": "[data-slot=\"terminal-line\"][data-variant=\"prompt\"]"
    },
    {
      "name": "Terminal line, info · Playground",
      "sel": "[data-slot=\"terminal-line\"][data-variant=\"info\"]"
    },
    {
      "name": "Terminal line, success · Playground",
      "sel": "[data-slot=\"terminal-line\"][data-variant=\"success\"]"
    },
    {
      "name": "Terminal line, warning · Playground",
      "sel": "[data-slot=\"terminal-line\"][data-variant=\"warning\"]"
    },
    {
      "name": "Terminal line, error · Playground",
      "sel": "[data-slot=\"terminal-line\"][data-variant=\"error\"]"
    },
    {
      "name": "Toggle, outline",
      "sel": "[data-slot=\"toggle\"][data-variant=\"outline\"]"
    },
    {
      "name": "Accordion",
      "sel": "[data-slot=\"accordion\"]"
    },
    {
      "name": "Accordion item",
      "sel": "[data-slot=\"accordion-item\"]"
    },
    {
      "name": "Accordion trigger",
      "sel": "[data-slot=\"accordion-trigger\"]"
    },
    {
      "name": "Accordion trigger icon",
      "sel": "[data-slot=\"accordion-trigger-icon\"]"
    },
    {
      "name": "Accordion content",
      "sel": "[data-slot=\"accordion-content\"]"
    },
    {
      "name": "Achievement · Playground",
      "sel": "[data-slot=\"achievement\"]"
    },
    {
      "name": "Achievement media · Playground",
      "sel": "[data-slot=\"achievement-media\"]"
    },
    {
      "name": "Achievement label · Playground",
      "sel": "[data-slot=\"achievement-label\"]"
    },
    {
      "name": "Action card · Playground",
      "sel": "[data-slot=\"action-card\"]"
    },
    {
      "name": "Action card media · Playground",
      "sel": "[data-slot=\"action-card-media\"]"
    },
    {
      "name": "Action card content · Playground",
      "sel": "[data-slot=\"action-card-content\"]"
    },
    {
      "name": "Action card eyebrow · Playground",
      "sel": "[data-slot=\"action-card-eyebrow\"]"
    },
    {
      "name": "Action card title · Playground",
      "sel": "[data-slot=\"action-card-title\"]"
    },
    {
      "name": "Action card description · Playground",
      "sel": "[data-slot=\"action-card-description\"]"
    },
    {
      "name": "Action card link · Playground",
      "sel": "[data-slot=\"action-card-link\"]"
    },
    {
      "name": "Action card action · Playground",
      "sel": "[data-slot=\"action-card-action\"]"
    },
    {
      "name": "Alert dialog",
      "sel": "[data-slot=\"alert-dialog\"]"
    },
    {
      "name": "Alert dialog trigger",
      "sel": "[data-slot=\"alert-dialog-trigger\"]"
    },
    {
      "name": "Alert dialog portal",
      "sel": "[data-slot=\"alert-dialog-portal\"]"
    },
    {
      "name": "Alert dialog overlay",
      "sel": "[data-slot=\"alert-dialog-overlay\"]"
    },
    {
      "name": "Alert dialog content",
      "sel": "[data-slot=\"alert-dialog-content\"]"
    },
    {
      "name": "Alert dialog header",
      "sel": "[data-slot=\"alert-dialog-header\"]"
    },
    {
      "name": "Alert dialog footer",
      "sel": "[data-slot=\"alert-dialog-footer\"]"
    },
    {
      "name": "Alert dialog media",
      "sel": "[data-slot=\"alert-dialog-media\"]"
    },
    {
      "name": "Alert dialog title",
      "sel": "[data-slot=\"alert-dialog-title\"]"
    },
    {
      "name": "Alert dialog description",
      "sel": "[data-slot=\"alert-dialog-description\"]"
    },
    {
      "name": "Alert dialog action",
      "sel": "[data-slot=\"alert-dialog-action\"]"
    },
    {
      "name": "Alert dialog cancel",
      "sel": "[data-slot=\"alert-dialog-cancel\"]"
    },
    {
      "name": "Alert",
      "sel": "[data-slot=\"alert\"]"
    },
    {
      "name": "Alert title",
      "sel": "[data-slot=\"alert-title\"]"
    },
    {
      "name": "Alert description",
      "sel": "[data-slot=\"alert-description\"]"
    },
    {
      "name": "Alert action",
      "sel": "[data-slot=\"alert-action\"]"
    },
    {
      "name": "Aspect ratio",
      "sel": "[data-slot=\"aspect-ratio\"]"
    },
    {
      "name": "Attachment",
      "sel": "[data-slot=\"attachment\"]"
    },
    {
      "name": "Attachment media",
      "sel": "[data-slot=\"attachment-media\"]"
    },
    {
      "name": "Attachment content",
      "sel": "[data-slot=\"attachment-content\"]"
    },
    {
      "name": "Attachment title",
      "sel": "[data-slot=\"attachment-title\"]"
    },
    {
      "name": "Attachment description",
      "sel": "[data-slot=\"attachment-description\"]"
    },
    {
      "name": "Attachment actions",
      "sel": "[data-slot=\"attachment-actions\"]"
    },
    {
      "name": "Attachment action",
      "sel": "[data-slot=\"attachment-action\"]"
    },
    {
      "name": "Attachment trigger",
      "sel": "[data-slot=\"attachment-trigger\"]"
    },
    {
      "name": "Attachment group",
      "sel": "[data-slot=\"attachment-group\"]"
    },
    {
      "name": "Avatar",
      "sel": "[data-slot=\"avatar\"]"
    },
    {
      "name": "Avatar image",
      "sel": "[data-slot=\"avatar-image\"]"
    },
    {
      "name": "Avatar fallback",
      "sel": "[data-slot=\"avatar-fallback\"]"
    },
    {
      "name": "Avatar badge",
      "sel": "[data-slot=\"avatar-badge\"]"
    },
    {
      "name": "Avatar group",
      "sel": "[data-slot=\"avatar-group\"]"
    },
    {
      "name": "Avatar group count",
      "sel": "[data-slot=\"avatar-group-count\"]"
    },
    {
      "name": "Badge",
      "sel": "[data-slot=\"badge\"]"
    },
    {
      "name": "Brand button · Playground",
      "sel": "[data-slot=\"brand-button\"]"
    },
    {
      "name": "Brand button icon · Playground",
      "sel": "[data-slot=\"brand-button-icon\"]"
    },
    {
      "name": "Breadcrumb",
      "sel": "[data-slot=\"breadcrumb\"]"
    },
    {
      "name": "Breadcrumb list",
      "sel": "[data-slot=\"breadcrumb-list\"]"
    },
    {
      "name": "Breadcrumb item",
      "sel": "[data-slot=\"breadcrumb-item\"]"
    },
    {
      "name": "Breadcrumb link",
      "sel": "[data-slot=\"breadcrumb-link\"]"
    },
    {
      "name": "Breadcrumb page",
      "sel": "[data-slot=\"breadcrumb-page\"]"
    },
    {
      "name": "Breadcrumb separator",
      "sel": "[data-slot=\"breadcrumb-separator\"]"
    },
    {
      "name": "Breadcrumb ellipsis",
      "sel": "[data-slot=\"breadcrumb-ellipsis\"]"
    },
    {
      "name": "Bubble group",
      "sel": "[data-slot=\"bubble-group\"]"
    },
    {
      "name": "Bubble",
      "sel": "[data-slot=\"bubble\"]"
    },
    {
      "name": "Bubble content",
      "sel": "[data-slot=\"bubble-content\"]"
    },
    {
      "name": "Bubble reactions",
      "sel": "[data-slot=\"bubble-reactions\"]"
    },
    {
      "name": "Button group",
      "sel": "[data-slot=\"button-group\"]"
    },
    {
      "name": "Button group separator",
      "sel": "[data-slot=\"button-group-separator\"]"
    },
    {
      "name": "Button",
      "sel": "[data-slot=\"button\"]"
    },
    {
      "name": "Calendar",
      "sel": "[data-slot=\"calendar\"]"
    },
    {
      "name": "Callout · Playground",
      "sel": "[data-slot=\"callout\"]"
    },
    {
      "name": "Callout title · Playground",
      "sel": "[data-slot=\"callout-title\"]"
    },
    {
      "name": "Callout description · Playground",
      "sel": "[data-slot=\"callout-description\"]"
    },
    {
      "name": "Card",
      "sel": "[data-slot=\"card\"]"
    },
    {
      "name": "Card header",
      "sel": "[data-slot=\"card-header\"]"
    },
    {
      "name": "Card title",
      "sel": "[data-slot=\"card-title\"]"
    },
    {
      "name": "Card description",
      "sel": "[data-slot=\"card-description\"]"
    },
    {
      "name": "Card action",
      "sel": "[data-slot=\"card-action\"]"
    },
    {
      "name": "Card content",
      "sel": "[data-slot=\"card-content\"]"
    },
    {
      "name": "Card footer",
      "sel": "[data-slot=\"card-footer\"]"
    },
    {
      "name": "Carousel",
      "sel": "[data-slot=\"carousel\"]"
    },
    {
      "name": "Carousel content",
      "sel": "[data-slot=\"carousel-content\"]"
    },
    {
      "name": "Carousel item",
      "sel": "[data-slot=\"carousel-item\"]"
    },
    {
      "name": "Carousel previous",
      "sel": "[data-slot=\"carousel-previous\"]"
    },
    {
      "name": "Carousel next",
      "sel": "[data-slot=\"carousel-next\"]"
    },
    {
      "name": "Chart",
      "sel": "[data-slot=\"chart\"]"
    },
    {
      "name": "Checkbox",
      "sel": "[data-slot=\"checkbox\"]"
    },
    {
      "name": "Checkbox indicator",
      "sel": "[data-slot=\"checkbox-indicator\"]"
    },
    {
      "name": "Code block · Playground",
      "sel": "[data-slot=\"code-block\"]"
    },
    {
      "name": "Code block header · Playground",
      "sel": "[data-slot=\"code-block-header\"]"
    },
    {
      "name": "Code block title · Playground",
      "sel": "[data-slot=\"code-block-title\"]"
    },
    {
      "name": "Code block actions · Playground",
      "sel": "[data-slot=\"code-block-actions\"]"
    },
    {
      "name": "Code block content · Playground",
      "sel": "[data-slot=\"code-block-content\"]"
    },
    {
      "name": "Code block line · Playground",
      "sel": "[data-slot=\"code-block-line\"]"
    },
    {
      "name": "Collapsible",
      "sel": "[data-slot=\"collapsible\"]"
    },
    {
      "name": "Collapsible trigger",
      "sel": "[data-slot=\"collapsible-trigger\"]"
    },
    {
      "name": "Collapsible content",
      "sel": "[data-slot=\"collapsible-content\"]"
    },
    {
      "name": "Combobox value",
      "sel": "[data-slot=\"combobox-value\"]"
    },
    {
      "name": "Combobox trigger",
      "sel": "[data-slot=\"combobox-trigger\"]"
    },
    {
      "name": "Combobox clear",
      "sel": "[data-slot=\"combobox-clear\"]"
    },
    {
      "name": "Input group button",
      "sel": "[data-slot=\"input-group-button\"]"
    },
    {
      "name": "Combobox content",
      "sel": "[data-slot=\"combobox-content\"]"
    },
    {
      "name": "Combobox list",
      "sel": "[data-slot=\"combobox-list\"]"
    },
    {
      "name": "Combobox item",
      "sel": "[data-slot=\"combobox-item\"]"
    },
    {
      "name": "Combobox group",
      "sel": "[data-slot=\"combobox-group\"]"
    },
    {
      "name": "Combobox label",
      "sel": "[data-slot=\"combobox-label\"]"
    },
    {
      "name": "Combobox collection",
      "sel": "[data-slot=\"combobox-collection\"]"
    },
    {
      "name": "Combobox empty",
      "sel": "[data-slot=\"combobox-empty\"]"
    },
    {
      "name": "Combobox separator",
      "sel": "[data-slot=\"combobox-separator\"]"
    },
    {
      "name": "Combobox chips",
      "sel": "[data-slot=\"combobox-chips\"]"
    },
    {
      "name": "Combobox chip",
      "sel": "[data-slot=\"combobox-chip\"]"
    },
    {
      "name": "Combobox chip remove",
      "sel": "[data-slot=\"combobox-chip-remove\"]"
    },
    {
      "name": "Combobox chip input",
      "sel": "[data-slot=\"combobox-chip-input\"]"
    },
    {
      "name": "Command",
      "sel": "[data-slot=\"command\"]"
    },
    {
      "name": "Command input wrapper",
      "sel": "[data-slot=\"command-input-wrapper\"]"
    },
    {
      "name": "Command input",
      "sel": "[data-slot=\"command-input\"]"
    },
    {
      "name": "Command list",
      "sel": "[data-slot=\"command-list\"]"
    },
    {
      "name": "Command empty",
      "sel": "[data-slot=\"command-empty\"]"
    },
    {
      "name": "Command group",
      "sel": "[data-slot=\"command-group\"]"
    },
    {
      "name": "Command separator",
      "sel": "[data-slot=\"command-separator\"]"
    },
    {
      "name": "Command item",
      "sel": "[data-slot=\"command-item\"]"
    },
    {
      "name": "Command shortcut",
      "sel": "[data-slot=\"command-shortcut\"]"
    },
    {
      "name": "Composer · Playground",
      "sel": "[data-slot=\"composer\"]"
    },
    {
      "name": "Composer banner · Playground",
      "sel": "[data-slot=\"composer-banner\"]"
    },
    {
      "name": "Composer context · Playground",
      "sel": "[data-slot=\"composer-context\"]"
    },
    {
      "name": "Composer chip · Playground",
      "sel": "[data-slot=\"composer-chip\"]"
    },
    {
      "name": "Composer input · Playground",
      "sel": "[data-slot=\"composer-input\"]"
    },
    {
      "name": "Composer toolbar · Playground",
      "sel": "[data-slot=\"composer-toolbar\"]"
    },
    {
      "name": "Composer add · Playground",
      "sel": "[data-slot=\"composer-add\"]"
    },
    {
      "name": "Composer model · Playground",
      "sel": "[data-slot=\"composer-model\"]"
    },
    {
      "name": "Composer effort · Playground",
      "sel": "[data-slot=\"composer-effort\"]"
    },
    {
      "name": "Composer stop · Playground",
      "sel": "[data-slot=\"composer-stop\"]"
    },
    {
      "name": "Composer send · Playground",
      "sel": "[data-slot=\"composer-send\"]"
    },
    {
      "name": "Console drawer · Playground",
      "sel": "[data-slot=\"console-drawer\"]"
    },
    {
      "name": "Console drawer bar · Playground",
      "sel": "[data-slot=\"console-drawer-bar\"]"
    },
    {
      "name": "Console drawer trigger · Playground",
      "sel": "[data-slot=\"console-drawer-trigger\"]"
    },
    {
      "name": "Console drawer status · Playground",
      "sel": "[data-slot=\"console-drawer-status\"]"
    },
    {
      "name": "Console drawer actions · Playground",
      "sel": "[data-slot=\"console-drawer-actions\"]"
    },
    {
      "name": "Console drawer content · Playground",
      "sel": "[data-slot=\"console-drawer-content\"]"
    },
    {
      "name": "Context menu",
      "sel": "[data-slot=\"context-menu\"]"
    },
    {
      "name": "Context menu trigger",
      "sel": "[data-slot=\"context-menu-trigger\"]"
    },
    {
      "name": "Context menu group",
      "sel": "[data-slot=\"context-menu-group\"]"
    },
    {
      "name": "Context menu portal",
      "sel": "[data-slot=\"context-menu-portal\"]"
    },
    {
      "name": "Context menu sub",
      "sel": "[data-slot=\"context-menu-sub\"]"
    },
    {
      "name": "Context menu radio group",
      "sel": "[data-slot=\"context-menu-radio-group\"]"
    },
    {
      "name": "Context menu content",
      "sel": "[data-slot=\"context-menu-content\"]"
    },
    {
      "name": "Context menu item",
      "sel": "[data-slot=\"context-menu-item\"]"
    },
    {
      "name": "Context menu sub trigger",
      "sel": "[data-slot=\"context-menu-sub-trigger\"]"
    },
    {
      "name": "Context menu sub content",
      "sel": "[data-slot=\"context-menu-sub-content\"]"
    },
    {
      "name": "Context menu checkbox item",
      "sel": "[data-slot=\"context-menu-checkbox-item\"]"
    },
    {
      "name": "Context menu radio item",
      "sel": "[data-slot=\"context-menu-radio-item\"]"
    },
    {
      "name": "Context menu label",
      "sel": "[data-slot=\"context-menu-label\"]"
    },
    {
      "name": "Context menu separator",
      "sel": "[data-slot=\"context-menu-separator\"]"
    },
    {
      "name": "Context menu shortcut",
      "sel": "[data-slot=\"context-menu-shortcut\"]"
    },
    {
      "name": "Copy button · Playground",
      "sel": "[data-slot=\"copy-button\"]"
    },
    {
      "name": "Diagnostic · Playground",
      "sel": "[data-slot=\"diagnostic\"]"
    },
    {
      "name": "Diagnostic header · Playground",
      "sel": "[data-slot=\"diagnostic-header\"]"
    },
    {
      "name": "Diagnostic title · Playground",
      "sel": "[data-slot=\"diagnostic-title\"]"
    },
    {
      "name": "Diagnostic code · Playground",
      "sel": "[data-slot=\"diagnostic-code\"]"
    },
    {
      "name": "Diagnostic description · Playground",
      "sel": "[data-slot=\"diagnostic-description\"]"
    },
    {
      "name": "Diagnostic source · Playground",
      "sel": "[data-slot=\"diagnostic-source\"]"
    },
    {
      "name": "Diagnostic line · Playground",
      "sel": "[data-slot=\"diagnostic-line\"]"
    },
    {
      "name": "Diagnostic footer · Playground",
      "sel": "[data-slot=\"diagnostic-footer\"]"
    },
    {
      "name": "Dialog",
      "sel": "[data-slot=\"dialog\"]"
    },
    {
      "name": "Dialog trigger",
      "sel": "[data-slot=\"dialog-trigger\"]"
    },
    {
      "name": "Dialog portal",
      "sel": "[data-slot=\"dialog-portal\"]"
    },
    {
      "name": "Dialog close",
      "sel": "[data-slot=\"dialog-close\"]"
    },
    {
      "name": "Dialog overlay",
      "sel": "[data-slot=\"dialog-overlay\"]"
    },
    {
      "name": "Dialog content",
      "sel": "[data-slot=\"dialog-content\"]"
    },
    {
      "name": "Dialog header",
      "sel": "[data-slot=\"dialog-header\"]"
    },
    {
      "name": "Dialog footer",
      "sel": "[data-slot=\"dialog-footer\"]"
    },
    {
      "name": "Dialog title",
      "sel": "[data-slot=\"dialog-title\"]"
    },
    {
      "name": "Dialog description",
      "sel": "[data-slot=\"dialog-description\"]"
    },
    {
      "name": "Diff · Playground",
      "sel": "[data-slot=\"diff\"]"
    },
    {
      "name": "Diff header · Playground",
      "sel": "[data-slot=\"diff-header\"]"
    },
    {
      "name": "Diff title · Playground",
      "sel": "[data-slot=\"diff-title\"]"
    },
    {
      "name": "Diff stat · Playground",
      "sel": "[data-slot=\"diff-stat\"]"
    },
    {
      "name": "Diff content · Playground",
      "sel": "[data-slot=\"diff-content\"]"
    },
    {
      "name": "Diff line · Playground",
      "sel": "[data-slot=\"diff-line\"]"
    },
    {
      "name": "Diff footer · Playground",
      "sel": "[data-slot=\"diff-footer\"]"
    },
    {
      "name": "Drawer",
      "sel": "[data-slot=\"drawer\"]"
    },
    {
      "name": "Drawer trigger",
      "sel": "[data-slot=\"drawer-trigger\"]"
    },
    {
      "name": "Drawer portal",
      "sel": "[data-slot=\"drawer-portal\"]"
    },
    {
      "name": "Drawer close",
      "sel": "[data-slot=\"drawer-close\"]"
    },
    {
      "name": "Drawer overlay",
      "sel": "[data-slot=\"drawer-overlay\"]"
    },
    {
      "name": "Drawer content",
      "sel": "[data-slot=\"drawer-content\"]"
    },
    {
      "name": "Drawer header",
      "sel": "[data-slot=\"drawer-header\"]"
    },
    {
      "name": "Drawer footer",
      "sel": "[data-slot=\"drawer-footer\"]"
    },
    {
      "name": "Drawer title",
      "sel": "[data-slot=\"drawer-title\"]"
    },
    {
      "name": "Drawer description",
      "sel": "[data-slot=\"drawer-description\"]"
    },
    {
      "name": "Drop zone · Playground",
      "sel": "[data-slot=\"drop-zone\"]"
    },
    {
      "name": "Drop zone icon · Playground",
      "sel": "[data-slot=\"drop-zone-icon\"]"
    },
    {
      "name": "Drop zone title · Playground",
      "sel": "[data-slot=\"drop-zone-title\"]"
    },
    {
      "name": "Drop zone description · Playground",
      "sel": "[data-slot=\"drop-zone-description\"]"
    },
    {
      "name": "Dropdown menu",
      "sel": "[data-slot=\"dropdown-menu\"]"
    },
    {
      "name": "Dropdown menu portal",
      "sel": "[data-slot=\"dropdown-menu-portal\"]"
    },
    {
      "name": "Dropdown menu trigger",
      "sel": "[data-slot=\"dropdown-menu-trigger\"]"
    },
    {
      "name": "Dropdown menu content",
      "sel": "[data-slot=\"dropdown-menu-content\"]"
    },
    {
      "name": "Dropdown menu group",
      "sel": "[data-slot=\"dropdown-menu-group\"]"
    },
    {
      "name": "Dropdown menu item",
      "sel": "[data-slot=\"dropdown-menu-item\"]"
    },
    {
      "name": "Dropdown menu checkbox item",
      "sel": "[data-slot=\"dropdown-menu-checkbox-item\"]"
    },
    {
      "name": "Dropdown menu checkbox item indicator",
      "sel": "[data-slot=\"dropdown-menu-checkbox-item-indicator\"]"
    },
    {
      "name": "Dropdown menu radio group",
      "sel": "[data-slot=\"dropdown-menu-radio-group\"]"
    },
    {
      "name": "Dropdown menu radio item",
      "sel": "[data-slot=\"dropdown-menu-radio-item\"]"
    },
    {
      "name": "Dropdown menu radio item indicator",
      "sel": "[data-slot=\"dropdown-menu-radio-item-indicator\"]"
    },
    {
      "name": "Dropdown menu label",
      "sel": "[data-slot=\"dropdown-menu-label\"]"
    },
    {
      "name": "Dropdown menu separator",
      "sel": "[data-slot=\"dropdown-menu-separator\"]"
    },
    {
      "name": "Dropdown menu shortcut",
      "sel": "[data-slot=\"dropdown-menu-shortcut\"]"
    },
    {
      "name": "Dropdown menu sub",
      "sel": "[data-slot=\"dropdown-menu-sub\"]"
    },
    {
      "name": "Dropdown menu sub trigger",
      "sel": "[data-slot=\"dropdown-menu-sub-trigger\"]"
    },
    {
      "name": "Dropdown menu sub content",
      "sel": "[data-slot=\"dropdown-menu-sub-content\"]"
    },
    {
      "name": "Editor tabs · Playground",
      "sel": "[data-slot=\"editor-tabs\"]"
    },
    {
      "name": "Editor tab · Playground",
      "sel": "[data-slot=\"editor-tab\"]"
    },
    {
      "name": "Editor tab trigger · Playground",
      "sel": "[data-slot=\"editor-tab-trigger\"]"
    },
    {
      "name": "Editor tab label · Playground",
      "sel": "[data-slot=\"editor-tab-label\"]"
    },
    {
      "name": "Editor tab close · Playground",
      "sel": "[data-slot=\"editor-tab-close\"]"
    },
    {
      "name": "Empty",
      "sel": "[data-slot=\"empty\"]"
    },
    {
      "name": "Empty header",
      "sel": "[data-slot=\"empty-header\"]"
    },
    {
      "name": "Empty icon",
      "sel": "[data-slot=\"empty-icon\"]"
    },
    {
      "name": "Empty title",
      "sel": "[data-slot=\"empty-title\"]"
    },
    {
      "name": "Empty description",
      "sel": "[data-slot=\"empty-description\"]"
    },
    {
      "name": "Empty content",
      "sel": "[data-slot=\"empty-content\"]"
    },
    {
      "name": "Field set",
      "sel": "[data-slot=\"field-set\"]"
    },
    {
      "name": "Field legend",
      "sel": "[data-slot=\"field-legend\"]"
    },
    {
      "name": "Field group",
      "sel": "[data-slot=\"field-group\"]"
    },
    {
      "name": "Field",
      "sel": "[data-slot=\"field\"]"
    },
    {
      "name": "Field content",
      "sel": "[data-slot=\"field-content\"]"
    },
    {
      "name": "Field label",
      "sel": "[data-slot=\"field-label\"]"
    },
    {
      "name": "Field description",
      "sel": "[data-slot=\"field-description\"]"
    },
    {
      "name": "Field separator",
      "sel": "[data-slot=\"field-separator\"]"
    },
    {
      "name": "Field separator content",
      "sel": "[data-slot=\"field-separator-content\"]"
    },
    {
      "name": "Field error",
      "sel": "[data-slot=\"field-error\"]"
    },
    {
      "name": "Help tip · Playground",
      "sel": "[data-slot=\"help-tip\"]"
    },
    {
      "name": "Hover card",
      "sel": "[data-slot=\"hover-card\"]"
    },
    {
      "name": "Hover card trigger",
      "sel": "[data-slot=\"hover-card-trigger\"]"
    },
    {
      "name": "Hover card portal",
      "sel": "[data-slot=\"hover-card-portal\"]"
    },
    {
      "name": "Hover card content",
      "sel": "[data-slot=\"hover-card-content\"]"
    },
    {
      "name": "Input group",
      "sel": "[data-slot=\"input-group\"]"
    },
    {
      "name": "Input group addon",
      "sel": "[data-slot=\"input-group-addon\"]"
    },
    {
      "name": "Input group control",
      "sel": "[data-slot=\"input-group-control\"]"
    },
    {
      "name": "Input otp",
      "sel": "[data-slot=\"input-otp\"]"
    },
    {
      "name": "Input otp group",
      "sel": "[data-slot=\"input-otp-group\"]"
    },
    {
      "name": "Input otp slot",
      "sel": "[data-slot=\"input-otp-slot\"]"
    },
    {
      "name": "Input otp separator",
      "sel": "[data-slot=\"input-otp-separator\"]"
    },
    {
      "name": "Input",
      "sel": "[data-slot=\"input\"]"
    },
    {
      "name": "Item group",
      "sel": "[data-slot=\"item-group\"]"
    },
    {
      "name": "Item separator",
      "sel": "[data-slot=\"item-separator\"]"
    },
    {
      "name": "Item",
      "sel": "[data-slot=\"item\"]"
    },
    {
      "name": "Item media",
      "sel": "[data-slot=\"item-media\"]"
    },
    {
      "name": "Item content",
      "sel": "[data-slot=\"item-content\"]"
    },
    {
      "name": "Item title",
      "sel": "[data-slot=\"item-title\"]"
    },
    {
      "name": "Item description",
      "sel": "[data-slot=\"item-description\"]"
    },
    {
      "name": "Item actions",
      "sel": "[data-slot=\"item-actions\"]"
    },
    {
      "name": "Item header",
      "sel": "[data-slot=\"item-header\"]"
    },
    {
      "name": "Item footer",
      "sel": "[data-slot=\"item-footer\"]"
    },
    {
      "name": "Kbd",
      "sel": "[data-slot=\"kbd\"]"
    },
    {
      "name": "Kbd group",
      "sel": "[data-slot=\"kbd-group\"]"
    },
    {
      "name": "Label",
      "sel": "[data-slot=\"label\"]"
    },
    {
      "name": "Logo · Playground",
      "sel": "[data-slot=\"logo\"]"
    },
    {
      "name": "Logo mark · Playground",
      "sel": "[data-slot=\"logo-mark\"]"
    },
    {
      "name": "Marker",
      "sel": "[data-slot=\"marker\"]"
    },
    {
      "name": "Marker icon",
      "sel": "[data-slot=\"marker-icon\"]"
    },
    {
      "name": "Marker content",
      "sel": "[data-slot=\"marker-content\"]"
    },
    {
      "name": "Menu item text · Playground",
      "sel": "[data-slot=\"menu-item-text\"]"
    },
    {
      "name": "Menu item description · Playground",
      "sel": "[data-slot=\"menu-item-description\"]"
    },
    {
      "name": "Menu note · Playground",
      "sel": "[data-slot=\"menu-note\"]"
    },
    {
      "name": "Menu fold · Playground",
      "sel": "[data-slot=\"menu-fold\"]"
    },
    {
      "name": "Menu fold trigger · Playground",
      "sel": "[data-slot=\"menu-fold-trigger\"]"
    },
    {
      "name": "Menu fold chevron · Playground",
      "sel": "[data-slot=\"menu-fold-chevron\"]"
    },
    {
      "name": "Menu fold content · Playground",
      "sel": "[data-slot=\"menu-fold-content\"]"
    },
    {
      "name": "Menubar",
      "sel": "[data-slot=\"menubar\"]"
    },
    {
      "name": "Menubar menu",
      "sel": "[data-slot=\"menubar-menu\"]"
    },
    {
      "name": "Menubar group",
      "sel": "[data-slot=\"menubar-group\"]"
    },
    {
      "name": "Menubar portal",
      "sel": "[data-slot=\"menubar-portal\"]"
    },
    {
      "name": "Menubar radio group",
      "sel": "[data-slot=\"menubar-radio-group\"]"
    },
    {
      "name": "Menubar trigger",
      "sel": "[data-slot=\"menubar-trigger\"]"
    },
    {
      "name": "Menubar content",
      "sel": "[data-slot=\"menubar-content\"]"
    },
    {
      "name": "Menubar item",
      "sel": "[data-slot=\"menubar-item\"]"
    },
    {
      "name": "Menubar checkbox item",
      "sel": "[data-slot=\"menubar-checkbox-item\"]"
    },
    {
      "name": "Menubar radio item",
      "sel": "[data-slot=\"menubar-radio-item\"]"
    },
    {
      "name": "Menubar label",
      "sel": "[data-slot=\"menubar-label\"]"
    },
    {
      "name": "Menubar separator",
      "sel": "[data-slot=\"menubar-separator\"]"
    },
    {
      "name": "Menubar shortcut",
      "sel": "[data-slot=\"menubar-shortcut\"]"
    },
    {
      "name": "Menubar sub",
      "sel": "[data-slot=\"menubar-sub\"]"
    },
    {
      "name": "Menubar sub trigger",
      "sel": "[data-slot=\"menubar-sub-trigger\"]"
    },
    {
      "name": "Menubar sub content",
      "sel": "[data-slot=\"menubar-sub-content\"]"
    },
    {
      "name": "Message scroller",
      "sel": "[data-slot=\"message-scroller\"]"
    },
    {
      "name": "Message scroller viewport",
      "sel": "[data-slot=\"message-scroller-viewport\"]"
    },
    {
      "name": "Message scroller content",
      "sel": "[data-slot=\"message-scroller-content\"]"
    },
    {
      "name": "Message scroller item",
      "sel": "[data-slot=\"message-scroller-item\"]"
    },
    {
      "name": "Message scroller button",
      "sel": "[data-slot=\"message-scroller-button\"]"
    },
    {
      "name": "Message group",
      "sel": "[data-slot=\"message-group\"]"
    },
    {
      "name": "Message",
      "sel": "[data-slot=\"message\"]"
    },
    {
      "name": "Message avatar",
      "sel": "[data-slot=\"message-avatar\"]"
    },
    {
      "name": "Message content",
      "sel": "[data-slot=\"message-content\"]"
    },
    {
      "name": "Message header",
      "sel": "[data-slot=\"message-header\"]"
    },
    {
      "name": "Message footer",
      "sel": "[data-slot=\"message-footer\"]"
    },
    {
      "name": "Modal · Playground",
      "sel": "[data-slot=\"modal\"]"
    },
    {
      "name": "Modal trigger · Playground",
      "sel": "[data-slot=\"modal-trigger\"]"
    },
    {
      "name": "Modal close · Playground",
      "sel": "[data-slot=\"modal-close\"]"
    },
    {
      "name": "Modal overlay · Playground",
      "sel": "[data-slot=\"modal-overlay\"]"
    },
    {
      "name": "Modal content · Playground",
      "sel": "[data-slot=\"modal-content\"]"
    },
    {
      "name": "Modal header · Playground",
      "sel": "[data-slot=\"modal-header\"]"
    },
    {
      "name": "Modal title · Playground",
      "sel": "[data-slot=\"modal-title\"]"
    },
    {
      "name": "Modal description · Playground",
      "sel": "[data-slot=\"modal-description\"]"
    },
    {
      "name": "Modal body · Playground",
      "sel": "[data-slot=\"modal-body\"]"
    },
    {
      "name": "Modal footer · Playground",
      "sel": "[data-slot=\"modal-footer\"]"
    },
    {
      "name": "Native select wrapper",
      "sel": "[data-slot=\"native-select-wrapper\"]"
    },
    {
      "name": "Native select",
      "sel": "[data-slot=\"native-select\"]"
    },
    {
      "name": "Native select icon",
      "sel": "[data-slot=\"native-select-icon\"]"
    },
    {
      "name": "Native select option",
      "sel": "[data-slot=\"native-select-option\"]"
    },
    {
      "name": "Native select optgroup",
      "sel": "[data-slot=\"native-select-optgroup\"]"
    },
    {
      "name": "Navigation menu",
      "sel": "[data-slot=\"navigation-menu\"]"
    },
    {
      "name": "Navigation menu list",
      "sel": "[data-slot=\"navigation-menu-list\"]"
    },
    {
      "name": "Navigation menu item",
      "sel": "[data-slot=\"navigation-menu-item\"]"
    },
    {
      "name": "Navigation menu trigger",
      "sel": "[data-slot=\"navigation-menu-trigger\"]"
    },
    {
      "name": "Navigation menu content",
      "sel": "[data-slot=\"navigation-menu-content\"]"
    },
    {
      "name": "Navigation menu viewport",
      "sel": "[data-slot=\"navigation-menu-viewport\"]"
    },
    {
      "name": "Navigation menu link",
      "sel": "[data-slot=\"navigation-menu-link\"]"
    },
    {
      "name": "Navigation menu indicator",
      "sel": "[data-slot=\"navigation-menu-indicator\"]"
    },
    {
      "name": "Objective band · Playground",
      "sel": "[data-slot=\"objective-band\"]"
    },
    {
      "name": "Objective meter · Playground",
      "sel": "[data-slot=\"objective-meter\"]"
    },
    {
      "name": "Objective text · Playground",
      "sel": "[data-slot=\"objective-text\"]"
    },
    {
      "name": "Objective nav · Playground",
      "sel": "[data-slot=\"objective-nav\"]"
    },
    {
      "name": "Objective actions · Playground",
      "sel": "[data-slot=\"objective-actions\"]"
    },
    {
      "name": "Pagination",
      "sel": "[data-slot=\"pagination\"]"
    },
    {
      "name": "Pagination content",
      "sel": "[data-slot=\"pagination-content\"]"
    },
    {
      "name": "Pagination item",
      "sel": "[data-slot=\"pagination-item\"]"
    },
    {
      "name": "Pagination link",
      "sel": "[data-slot=\"pagination-link\"]"
    },
    {
      "name": "Pagination ellipsis",
      "sel": "[data-slot=\"pagination-ellipsis\"]"
    },
    {
      "name": "Popover",
      "sel": "[data-slot=\"popover\"]"
    },
    {
      "name": "Popover trigger",
      "sel": "[data-slot=\"popover-trigger\"]"
    },
    {
      "name": "Popover content",
      "sel": "[data-slot=\"popover-content\"]"
    },
    {
      "name": "Popover anchor",
      "sel": "[data-slot=\"popover-anchor\"]"
    },
    {
      "name": "Popover header",
      "sel": "[data-slot=\"popover-header\"]"
    },
    {
      "name": "Popover title",
      "sel": "[data-slot=\"popover-title\"]"
    },
    {
      "name": "Popover description",
      "sel": "[data-slot=\"popover-description\"]"
    },
    {
      "name": "Progress",
      "sel": "[data-slot=\"progress\"]"
    },
    {
      "name": "Progress indicator",
      "sel": "[data-slot=\"progress-indicator\"]"
    },
    {
      "name": "Questionnaire",
      "sel": "[data-slot=\"questionnaire\"]"
    },
    {
      "name": "Questionnaire progress",
      "sel": "[data-slot=\"questionnaire-progress\"]"
    },
    {
      "name": "Questionnaire item",
      "sel": "[data-slot=\"questionnaire-item\"]"
    },
    {
      "name": "Questionnaire title",
      "sel": "[data-slot=\"questionnaire-title\"]"
    },
    {
      "name": "Questionnaire description",
      "sel": "[data-slot=\"questionnaire-description\"]"
    },
    {
      "name": "Questionnaire choices",
      "sel": "[data-slot=\"questionnaire-choices\"]"
    },
    {
      "name": "Questionnaire choice",
      "sel": "[data-slot=\"questionnaire-choice\"]"
    },
    {
      "name": "Questionnaire choice input",
      "sel": "[data-slot=\"questionnaire-choice-input\"]"
    },
    {
      "name": "Questionnaire choice indicator",
      "sel": "[data-slot=\"questionnaire-choice-indicator\"]"
    },
    {
      "name": "Questionnaire choice indicator dot",
      "sel": "[data-slot=\"questionnaire-choice-indicator-dot\"]"
    },
    {
      "name": "Questionnaire choice indicator check",
      "sel": "[data-slot=\"questionnaire-choice-indicator-check\"]"
    },
    {
      "name": "Questionnaire choice label",
      "sel": "[data-slot=\"questionnaire-choice-label\"]"
    },
    {
      "name": "Questionnaire choice shortcut",
      "sel": "[data-slot=\"questionnaire-choice-shortcut\"]"
    },
    {
      "name": "Questionnaire choice description",
      "sel": "[data-slot=\"questionnaire-choice-description\"]"
    },
    {
      "name": "Questionnaire input wrapper",
      "sel": "[data-slot=\"questionnaire-input-wrapper\"]"
    },
    {
      "name": "Questionnaire input",
      "sel": "[data-slot=\"questionnaire-input\"]"
    },
    {
      "name": "Questionnaire error",
      "sel": "[data-slot=\"questionnaire-error\"]"
    },
    {
      "name": "Questionnaire actions",
      "sel": "[data-slot=\"questionnaire-actions\"]"
    },
    {
      "name": "Questionnaire previous",
      "sel": "[data-slot=\"questionnaire-previous\"]"
    },
    {
      "name": "Questionnaire skip",
      "sel": "[data-slot=\"questionnaire-skip\"]"
    },
    {
      "name": "Questionnaire next",
      "sel": "[data-slot=\"questionnaire-next\"]"
    },
    {
      "name": "Questionnaire submit",
      "sel": "[data-slot=\"questionnaire-submit\"]"
    },
    {
      "name": "Radio group",
      "sel": "[data-slot=\"radio-group\"]"
    },
    {
      "name": "Radio group item",
      "sel": "[data-slot=\"radio-group-item\"]"
    },
    {
      "name": "Radio group indicator",
      "sel": "[data-slot=\"radio-group-indicator\"]"
    },
    {
      "name": "Resizable panel group",
      "sel": "[data-slot=\"resizable-panel-group\"]"
    },
    {
      "name": "Resizable panel",
      "sel": "[data-slot=\"resizable-panel\"]"
    },
    {
      "name": "Resizable handle",
      "sel": "[data-slot=\"resizable-handle\"]"
    },
    {
      "name": "Scroll area",
      "sel": "[data-slot=\"scroll-area\"]"
    },
    {
      "name": "Scroll area viewport",
      "sel": "[data-slot=\"scroll-area-viewport\"]"
    },
    {
      "name": "Scroll area scrollbar",
      "sel": "[data-slot=\"scroll-area-scrollbar\"]"
    },
    {
      "name": "Scroll area thumb",
      "sel": "[data-slot=\"scroll-area-thumb\"]"
    },
    {
      "name": "Segmented item · Playground",
      "sel": "[data-slot=\"segmented-item\"]"
    },
    {
      "name": "Segmented · Playground",
      "sel": "[data-slot=\"segmented\"]"
    },
    {
      "name": "Segmented thumb · Playground",
      "sel": "[data-slot=\"segmented-thumb\"]"
    },
    {
      "name": "Segmented count · Playground",
      "sel": "[data-slot=\"segmented-count\"]"
    },
    {
      "name": "Select",
      "sel": "[data-slot=\"select\"]"
    },
    {
      "name": "Select group",
      "sel": "[data-slot=\"select-group\"]"
    },
    {
      "name": "Select value",
      "sel": "[data-slot=\"select-value\"]"
    },
    {
      "name": "Select trigger",
      "sel": "[data-slot=\"select-trigger\"]"
    },
    {
      "name": "Select content",
      "sel": "[data-slot=\"select-content\"]"
    },
    {
      "name": "Select label",
      "sel": "[data-slot=\"select-label\"]"
    },
    {
      "name": "Select item",
      "sel": "[data-slot=\"select-item\"]"
    },
    {
      "name": "Select separator",
      "sel": "[data-slot=\"select-separator\"]"
    },
    {
      "name": "Select scroll up button",
      "sel": "[data-slot=\"select-scroll-up-button\"]"
    },
    {
      "name": "Select scroll down button",
      "sel": "[data-slot=\"select-scroll-down-button\"]"
    },
    {
      "name": "Separator",
      "sel": "[data-slot=\"separator\"]"
    },
    {
      "name": "Setup list · Playground",
      "sel": "[data-slot=\"setup-list\"]"
    },
    {
      "name": "Setup list header · Playground",
      "sel": "[data-slot=\"setup-list-header\"]"
    },
    {
      "name": "Setup list trigger · Playground",
      "sel": "[data-slot=\"setup-list-trigger\"]"
    },
    {
      "name": "Setup list dismiss · Playground",
      "sel": "[data-slot=\"setup-list-dismiss\"]"
    },
    {
      "name": "Setup list content · Playground",
      "sel": "[data-slot=\"setup-list-content\"]"
    },
    {
      "name": "Setup list item · Playground",
      "sel": "[data-slot=\"setup-list-item\"]"
    },
    {
      "name": "Setup list indicator · Playground",
      "sel": "[data-slot=\"setup-list-indicator\"]"
    },
    {
      "name": "Setup list label · Playground",
      "sel": "[data-slot=\"setup-list-label\"]"
    },
    {
      "name": "Setup list value · Playground",
      "sel": "[data-slot=\"setup-list-value\"]"
    },
    {
      "name": "Sheet",
      "sel": "[data-slot=\"sheet\"]"
    },
    {
      "name": "Sheet trigger",
      "sel": "[data-slot=\"sheet-trigger\"]"
    },
    {
      "name": "Sheet close",
      "sel": "[data-slot=\"sheet-close\"]"
    },
    {
      "name": "Sheet portal",
      "sel": "[data-slot=\"sheet-portal\"]"
    },
    {
      "name": "Sheet overlay",
      "sel": "[data-slot=\"sheet-overlay\"]"
    },
    {
      "name": "Sheet content",
      "sel": "[data-slot=\"sheet-content\"]"
    },
    {
      "name": "Sheet header",
      "sel": "[data-slot=\"sheet-header\"]"
    },
    {
      "name": "Sheet footer",
      "sel": "[data-slot=\"sheet-footer\"]"
    },
    {
      "name": "Sheet title",
      "sel": "[data-slot=\"sheet-title\"]"
    },
    {
      "name": "Sheet description",
      "sel": "[data-slot=\"sheet-description\"]"
    },
    {
      "name": "Sidebar wrapper",
      "sel": "[data-slot=\"sidebar-wrapper\"]"
    },
    {
      "name": "Sidebar",
      "sel": "[data-slot=\"sidebar\"]"
    },
    {
      "name": "Sidebar gap",
      "sel": "[data-slot=\"sidebar-gap\"]"
    },
    {
      "name": "Sidebar container",
      "sel": "[data-slot=\"sidebar-container\"]"
    },
    {
      "name": "Sidebar inner",
      "sel": "[data-slot=\"sidebar-inner\"]"
    },
    {
      "name": "Sidebar trigger",
      "sel": "[data-slot=\"sidebar-trigger\"]"
    },
    {
      "name": "Sidebar rail",
      "sel": "[data-slot=\"sidebar-rail\"]"
    },
    {
      "name": "Sidebar inset",
      "sel": "[data-slot=\"sidebar-inset\"]"
    },
    {
      "name": "Sidebar input",
      "sel": "[data-slot=\"sidebar-input\"]"
    },
    {
      "name": "Sidebar header",
      "sel": "[data-slot=\"sidebar-header\"]"
    },
    {
      "name": "Sidebar footer",
      "sel": "[data-slot=\"sidebar-footer\"]"
    },
    {
      "name": "Sidebar separator",
      "sel": "[data-slot=\"sidebar-separator\"]"
    },
    {
      "name": "Sidebar content",
      "sel": "[data-slot=\"sidebar-content\"]"
    },
    {
      "name": "Sidebar group",
      "sel": "[data-slot=\"sidebar-group\"]"
    },
    {
      "name": "Sidebar group label",
      "sel": "[data-slot=\"sidebar-group-label\"]"
    },
    {
      "name": "Sidebar group action",
      "sel": "[data-slot=\"sidebar-group-action\"]"
    },
    {
      "name": "Sidebar group content",
      "sel": "[data-slot=\"sidebar-group-content\"]"
    },
    {
      "name": "Sidebar menu",
      "sel": "[data-slot=\"sidebar-menu\"]"
    },
    {
      "name": "Sidebar menu item",
      "sel": "[data-slot=\"sidebar-menu-item\"]"
    },
    {
      "name": "Sidebar menu button",
      "sel": "[data-slot=\"sidebar-menu-button\"]"
    },
    {
      "name": "Sidebar menu action",
      "sel": "[data-slot=\"sidebar-menu-action\"]"
    },
    {
      "name": "Sidebar menu badge",
      "sel": "[data-slot=\"sidebar-menu-badge\"]"
    },
    {
      "name": "Sidebar menu skeleton",
      "sel": "[data-slot=\"sidebar-menu-skeleton\"]"
    },
    {
      "name": "Sidebar menu sub",
      "sel": "[data-slot=\"sidebar-menu-sub\"]"
    },
    {
      "name": "Sidebar menu sub item",
      "sel": "[data-slot=\"sidebar-menu-sub-item\"]"
    },
    {
      "name": "Sidebar menu sub button",
      "sel": "[data-slot=\"sidebar-menu-sub-button\"]"
    },
    {
      "name": "Skeleton",
      "sel": "[data-slot=\"skeleton\"]"
    },
    {
      "name": "Slider",
      "sel": "[data-slot=\"slider\"]"
    },
    {
      "name": "Slider track",
      "sel": "[data-slot=\"slider-track\"]"
    },
    {
      "name": "Slider range",
      "sel": "[data-slot=\"slider-range\"]"
    },
    {
      "name": "Slider thumb",
      "sel": "[data-slot=\"slider-thumb\"]"
    },
    {
      "name": "Spinner",
      "sel": "[data-slot=\"spinner\"]"
    },
    {
      "name": "Stage empty · Playground",
      "sel": "[data-slot=\"stage-empty\"]"
    },
    {
      "name": "Stage empty media · Playground",
      "sel": "[data-slot=\"stage-empty-media\"]"
    },
    {
      "name": "Stage empty title · Playground",
      "sel": "[data-slot=\"stage-empty-title\"]"
    },
    {
      "name": "Stage empty meta · Playground",
      "sel": "[data-slot=\"stage-empty-meta\"]"
    },
    {
      "name": "Stage empty description · Playground",
      "sel": "[data-slot=\"stage-empty-description\"]"
    },
    {
      "name": "Stage empty notice · Playground",
      "sel": "[data-slot=\"stage-empty-notice\"]"
    },
    {
      "name": "Stage empty actions · Playground",
      "sel": "[data-slot=\"stage-empty-actions\"]"
    },
    {
      "name": "Stage empty footer · Playground",
      "sel": "[data-slot=\"stage-empty-footer\"]"
    },
    {
      "name": "Status dot · Playground",
      "sel": "[data-slot=\"status-dot\"]"
    },
    {
      "name": "Step rail · Playground",
      "sel": "[data-slot=\"step-rail\"]"
    },
    {
      "name": "Step rail item · Playground",
      "sel": "[data-slot=\"step-rail-item\"]"
    },
    {
      "name": "Step rail indicator · Playground",
      "sel": "[data-slot=\"step-rail-indicator\"]"
    },
    {
      "name": "Step rail title · Playground",
      "sel": "[data-slot=\"step-rail-title\"]"
    },
    {
      "name": "Step rail meta · Playground",
      "sel": "[data-slot=\"step-rail-meta\"]"
    },
    {
      "name": "Stepper · Playground",
      "sel": "[data-slot=\"stepper\"]"
    },
    {
      "name": "Stepper item · Playground",
      "sel": "[data-slot=\"stepper-item\"]"
    },
    {
      "name": "Stepper list · Playground",
      "sel": "[data-slot=\"stepper-list\"]"
    },
    {
      "name": "Stepper indicator · Playground",
      "sel": "[data-slot=\"stepper-indicator\"]"
    },
    {
      "name": "Stepper label · Playground",
      "sel": "[data-slot=\"stepper-label\"]"
    },
    {
      "name": "Stepper errors · Playground",
      "sel": "[data-slot=\"stepper-errors\"]"
    },
    {
      "name": "Stepper target · Playground",
      "sel": "[data-slot=\"stepper-target\"]"
    },
    {
      "name": "Stepper content · Playground",
      "sel": "[data-slot=\"stepper-content\"]"
    },
    {
      "name": "Switch",
      "sel": "[data-slot=\"switch\"]"
    },
    {
      "name": "Switch thumb",
      "sel": "[data-slot=\"switch-thumb\"]"
    },
    {
      "name": "Table container",
      "sel": "[data-slot=\"table-container\"]"
    },
    {
      "name": "Table",
      "sel": "[data-slot=\"table\"]"
    },
    {
      "name": "Table header",
      "sel": "[data-slot=\"table-header\"]"
    },
    {
      "name": "Table body",
      "sel": "[data-slot=\"table-body\"]"
    },
    {
      "name": "Table footer",
      "sel": "[data-slot=\"table-footer\"]"
    },
    {
      "name": "Table row",
      "sel": "[data-slot=\"table-row\"]"
    },
    {
      "name": "Table head",
      "sel": "[data-slot=\"table-head\"]"
    },
    {
      "name": "Table cell",
      "sel": "[data-slot=\"table-cell\"]"
    },
    {
      "name": "Table caption",
      "sel": "[data-slot=\"table-caption\"]"
    },
    {
      "name": "Tabs",
      "sel": "[data-slot=\"tabs\"]"
    },
    {
      "name": "Tabs list",
      "sel": "[data-slot=\"tabs-list\"]"
    },
    {
      "name": "Tabs trigger",
      "sel": "[data-slot=\"tabs-trigger\"]"
    },
    {
      "name": "Tabs content",
      "sel": "[data-slot=\"tabs-content\"]"
    },
    {
      "name": "Tag · Playground",
      "sel": "[data-slot=\"tag\"]"
    },
    {
      "name": "Terminal · Playground",
      "sel": "[data-slot=\"terminal\"]"
    },
    {
      "name": "Terminal line · Playground",
      "sel": "[data-slot=\"terminal-line\"]"
    },
    {
      "name": "Terminal caret · Playground",
      "sel": "[data-slot=\"terminal-caret\"]"
    },
    {
      "name": "Textarea",
      "sel": "[data-slot=\"textarea\"]"
    },
    {
      "name": "Toggle group",
      "sel": "[data-slot=\"toggle-group\"]"
    },
    {
      "name": "Toggle group item",
      "sel": "[data-slot=\"toggle-group-item\"]"
    },
    {
      "name": "Toggle",
      "sel": "[data-slot=\"toggle\"]"
    },
    {
      "name": "Tooltip provider",
      "sel": "[data-slot=\"tooltip-provider\"]"
    },
    {
      "name": "Tooltip",
      "sel": "[data-slot=\"tooltip\"]"
    },
    {
      "name": "Tooltip trigger",
      "sel": "[data-slot=\"tooltip-trigger\"]"
    },
    {
      "name": "Tooltip content",
      "sel": "[data-slot=\"tooltip-content\"]"
    }
  ].concat([
    { name: 'Step bar',          sel: '[aria-label="Development loop"]' },
    { name: 'Step',              sel: '[id^="flow-stage-tab-"]' },
    { name: 'Step, active',      sel: '[aria-label$=": active"]' },
    { name: 'Stage panel',       sel: '[id^="flow-stage-panel-"]' },
    { name: 'Project panel',     sel: 'aside:has(#flow-left-tabpanel)' },
    { name: 'Assistant panel',   sel: 'aside:has([aria-label="Assistant sections"])' },
    { name: 'Console drawer',    sel: '#flow-console-drawer-body' },
    { name: 'Home',              sel: '#home' },
    { name: 'Resource card',     sel: 'div:has(> div > a[target="_blank"])' },
    { name: 'Terminal (xterm)',  sel: '.xterm' },
    { name: 'Terminal input',    sel: '[aria-label="Terminal input"]' },
    { name: 'Editor',            sel: '.monaco-editor' },
    { name: 'Cluster picker',    sel: '[aria-label^="Change cluster"]' },
    { name: 'Connect wallet',    sel: '[aria-label="Connect wallet"]' },
    { name: 'Sign in',           sel: '[aria-label="Sign in with GitHub"]' },
    { name: 'Settings button',   sel: '[aria-label="Open settings"]' },
    { name: 'API key field',     sel: '#assistant-api-key' },
    { name: 'Tabs',              sel: '[role=tablist]' },
    { name: 'Tab',               sel: '[role=tab]' },
    { name: 'Panel',             sel: '[role=tabpanel]' },
    { name: 'Select',            sel: '[role=combobox]' },
    { name: 'Radio group',       sel: '[role=radiogroup]' },
    { name: 'Radio',             sel: '[role=radio]' },
    { name: 'Modal',             sel: '[role=dialog]' },
    { name: 'Input',             sel: 'input[type=text], input:not([type])' },
    { name: 'Link',              sel: 'a[href]' },
    { name: 'Button',            sel: 'button' }
  ]),

  /* The decisions the Design tab offers. Each writes tokens, so everything
     built on the system follows at once. */
  presets: [
    { id: 'accent', name: 'Accent', note: 'what is current, and what acts',
      options: [
        ['purple', 'Purple', ':root,.dark{--primary:#8a3ff5 !important;--ring:#9945ff !important}'],
        ['violet', 'Violet', ':root,.dark{--primary:#6e56f8 !important;--ring:#8b7bff !important}'],
        ['green',  'Green',  ':root,.dark{--primary:#14f195 !important;--primary-foreground:#08080a !important;--ring:#14f195 !important}']
      ] },
    { id: 'radius', name: 'Corners', note: 'controls, panels and cards together',
      options: [
        ['tight', 'Tight', ':root{--radius:0.375rem !important}'],
        ['8',     'Default', ':root{--radius:0.5rem !important}'],
        ['soft',  'Soft', ':root{--radius:0.75rem !important}']
      ] },
    { id: 'density', name: 'Density', note: 'the one spacing unit every size is made of',
      options: [
        ['compact', 'Compact', ':root{--spacing:0.225rem !important}'],
        ['regular', 'Regular', ':root{--spacing:0.25rem !important}'],
        ['roomy',   'Roomy', ':root{--spacing:0.28rem !important}']
      ] },
    { id: 'weight', name: 'Weight', note: 'how heavy the type sits on the dark',
      options: [
        ['light',   'Light', ':root{--font-weight-read:320 !important;--font-weight-label:380 !important;--font-weight-act:440 !important}'],
        ['regular', 'Regular', ':root{--font-weight-read:400 !important;--font-weight-label:450 !important;--font-weight-act:520 !important}']
      ] }
  ],

  systemPage: '/design-system/',
  systemSelector: '[data-ds-block][id^="c-"]',
  systemCss: '/design-system/ds-inject.css',
  systemGround: 'dark',
  strip: ['c-brand-button-0', 'c-button-0', 'c-button-2', 'c-tag-0', 'c-badge-2', 'c-stepper-0', 'c-segmented-3', 'c-input-0'],
  essentials: [
    ['Accent', '--primary'], ['Focus ring', '--ring'], ['Brand green', '--brand-green'],
    ['Ink', '--foreground'], ['Ink, muted', '--muted-foreground'],
    ['Ground', '--background'], ['Card', '--card'], ['Popover', '--popover'],
    ['Line', '--border'], ['Field line', '--input'],
    ['Corner', '--radius'], ['Spacing unit', '--spacing'],
    ['Body size', '--text-body'], ['Reading weight', '--font-weight-read']
  ]
};
