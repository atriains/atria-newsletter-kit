ATRIA NEWSLETTER BUILD KIT
==========================

What it does
- Builds the two-page Atria newsletter PPTX for any category from a
  content.json file, then converts it to PDF. The design (palette,
  fonts, logo, waves, cards, contact block) lives in atria-kit.js, so
  every issue matches the approved templates.

Run
  ./setup.sh                                  (once per session)
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
- Photos (Well-Being): the PPTX leaves labeled photo frames. Put the
  recipe photo URL in recipe.photoUrl and in review.txt; Dustin inserts
  it. Never embed photos.

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
- setup.sh / build.sh environment setup and build
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
