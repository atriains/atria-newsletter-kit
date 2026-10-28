ATRIA NEWSLETTER BUILD KIT
==========================

What it does
- Builds the two-page Atria newsletter PPTX for any category from a
  content.json file, then converts it to PDF. The design (palette,
  fonts, logo, waves, cards, contact block) lives in atria-kit.js, so
  every issue matches the approved templates.

Run
  (no setup: packages, icons, and fonts are vendored in vendor/)
  ./build.sh issue.json /path/PREFIX          -> PREFIX_newsletter.pptx
                                                 PREFIX_newsletter.pdf
                                                 PREFIX_qa-page-1.png, -2.png
  Then LOOK at both QA page images. Fix any overflow by shortening copy
  in issue.json (never by editing atria-kit.js) and rebuild.

Writing issue.json
- Start from examples/<layout>.json for the category and replace the
  content. Keep every key. Keep list lengths exactly as in the example
  (4 cards, 4 timeline points, 3 heads-up items, 6 levers, 6 questions,
  6 stat tiles, etc.); the layout has a fixed slot for each.
- "layout": benefits-101 | well-being | compliance-corner |
            benefits-buzz | risk-report
- "issue": two digits ("02"). "issueTitle": 2-5 words.
- "headline": array of segments; "accent": true turns a segment amber;
  "br": true forces a line break after it. Keep the whole headline
  under ~60 characters (Well-Being under ~45).
- Icons: any Font Awesome 5 solid name from react-icons/fa, e.g.
  FaCheck, FaShieldAlt, FaPiggyBank, FaHeartbeat, FaUtensils.
- Photos (Well-Being): set "heroPhoto": {"file": "photos/x.jpg"} and
  "recipe": {"photoFile": "photos/y.jpg"} (paths relative to the content
  JSON; JPEG or PNG) and the kit cover-crops each into its frame. Leave a
  field out and the kit draws the labeled placeholder frame instead.
  Keep recipe.photoUrl as the source link.

Approximate length limits (characters, including spaces)
- subhead 170 | card title 30 | card body 130 | timeline detail 60
- heads-up / law-change body 90 | game-plan step 70 total
- calendar row detail 150 | checklist item 110 | question 75
- lever body 130 | stat label 60 | quote 50 | article paragraphs
  total ~800 | recipe ingredients max 15 | recipe steps max 6, ~120 each
If text overflows in the QA images, shorten it.

Risk Report
- Uses the Benefits Buzz layout with its own copper palette.
  Provisional until Dustin approves it.

Files
- atria-kit.js        layouts and design system
- build.sh            build (sets NODE_PATH and fonts itself)
- icons-fa.json       all Font Awesome 5 solid icons as 64px masks
- vendor/             pptxgenjs, jszip and deps; Selawik fonts
- logo-white.b64.txt  reversed logo (hero, dark cards)
- logo-color.b64.txt  color logo (light cards)
- examples/*.json     approved Issue 01 content per category (layout
                      reference; facts must be re-verified before reuse)

Routine files
- INSTRUCTIONS.txt    full drafting rules; the routine prompt points here,
                      so rule changes ship by pushing this file
- upload.py           uploads finished files to SharePoint 1-Review via
                      Microsoft Graph (needs ATRIA_TENANT_ID,
                      ATRIA_CLIENT_ID, ATRIA_CLIENT_SECRET)
- fetch.py            reads government pages, PDFs, eCFR sections, and
                      Federal Register searches as text for source checks

Flexible page 2 (Benefits 101)
- Add "page2": [rows] to issue.json to compose page 2 from blocks; the
  fixed page 2 keys (story, headsUp, gamePlan, contact) are then ignored.
- A row is one block or an array of blocks; widths full | half | wide
  (2/3) | narrow (1/3) must add to one page width.
- Blocks: story, stats, callout, checklist, contact (exactly one),
  mythfact, compare, qa, cards, text. Fields are listed at the top of
  page2.js; see examples/benefits-101-flex.json.
- If the blocks don't fit, the build stops with "page2 overflows by X
  in": shorten copy or drop a block, then rebuild and check the QA image.
