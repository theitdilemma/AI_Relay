# AI Relay — Chrome Web Store submission kit

Prepared for v0.4.7 by Kelly Hansen. This kit is not evidence of store approval or live-site certification.

## Listing fields

- Name: AI Relay
- Summary: Relay conversations between ChatGPT and Claude using your browser tabs. No API keys. Stay in control of each discussion.
- Category: Productivity (choose the closest available dashboard category).
- Language: English
- Developer: Kelly Hansen
- Homepage: https://github.com/theitdilemma/AI_Relay
- Support: https://github.com/theitdilemma/AI_Relay/issues
- Privacy policy: https://github.com/theitdilemma/AI_Relay/blob/main/PRIVACY.md
- Price: Free; separate provider subscriptions and usage limits may apply.

## Detailed description

Two perspectives. One conversation.

AI Relay passes messages between your signed-in ChatGPT and Claude website tabs so you can compare ideas without repeatedly copying replies between them. Developed by Kelly Hansen, it is free and open source.

Start with either model, enter your topic once, and follow the exchange in one shared dashboard. The second model receives your original prompt and the first response for context. A short introduction is sent once per provider conversation.

Features:

- Select open ChatGPT and Claude tabs; single matching tabs are selected automatically.
- Flip which model starts with the order-switch button.
- Use automatic forwarding or approve each handoff manually.
- Set a forward limit or remove the extension's counter limit with unlimited mode.
- Stop forwarding from the persistent top bar.
- End a run when either model responds with only #stop#.
- Optionally let #userInput# pause the relay so you can answer inside the dashboard.
- Interject to one or both models and pause the exchange.
- Follow a scrolling conversation and export recorded history as Markdown.

No API keys. No relay server. No extension telemetry. Conversation history and settings are stored locally in your Chrome profile. Starting or forwarding shares text with the selected AI provider through your signed-in website session. Your normal provider usage limits, policies, and subscriptions apply. Unlimited mode does not bypass those limits.

Requires signed-in ChatGPT and Claude tabs. This is an early testing release: website changes can affect capture and sending, and models may ignore control markers. Supervise conversations and review important output. Stopping the relay may not stop generation already underway on a provider website.

Independent of OpenAI and Anthropic; not affiliated with or endorsed by either. Released under the MIT License and provided as is. See the GitHub repository for source, privacy information, support, and the full disclaimer.

## Privacy practices fields

Single purpose: Human-moderated relay of conversation text between user-selected ChatGPT and Claude website tabs, with a local shared transcript.

Storage justification: Stores relay settings, selected tab identifiers, run state, original prompt, pending messages/questions, bounded conversation history, and introduction tracking in Chrome local extension storage.

Scripting justification: Injects only packaged adapters/content scripts into already-open supported tabs after installation or reload, to reconnect the user-selected chats.

Host permission justification: https://chatgpt.com/_ and https://claude.ai/_ are needed to identify supported tabs, read rendered assistant responses, and fill and submit their composers when the user starts or forwards a relay. No other website hosts are requested.

Remote code: No. All executable extension code is included in the ZIP. Reading generated conversation text is not loading executable code.

Data categories: Disclose personal communications (prompts and chat messages), website content (captured response text), and web history/visited URLs limited to the supported conversation URLs and titles used for tab selection and introduction tracking. Do not claim that no data is handled simply because storage is local. Review the dashboard's current category definitions and disclose personal information if applicable to the conversation content; the extension does not separately harvest identity, health, financial, or credential fields.

Certifications: Data is not sold or transferred for unrelated purposes; it is used only for the stated relay functionality; it is not used for creditworthiness or lending. Only certify statements that match the final uploaded build and current policy wording.

## Reviewer instructions

1. Install the submitted extension and open the toolbar dashboard.
2. Open chatgpt.com and claude.ai in Chrome and sign in with reviewer-controlled accounts. The extension has no separate login or paid tier. Do not share account credentials in this kit.
3. Refresh the two tabs and the dashboard's Connections list. Select the desired chats if multiple tabs exist.
4. Leave website composers empty. Choose manual forwarding and a small limit for a controlled first test.
5. Enter: "Compare Star Wars and Star Trek. Explain your criteria, respond to the other model's strongest point, and finish with only #stop# when there is nothing useful to add."
6. Start and review the first captured answer. Forward it to the other model and verify the original topic accompanies the first handoff.
7. Repeat with Claude first. Use Stop to end forwarding at any time.
8. With input requests enabled, ask the models to request one project constraint using #userInput# alone on the final line. If a model follows the instruction, answer in Your turn and choose Reply & resume.
9. Export the transcript and inspect local output. Clear history removes the extension transcript, not the provider chats.

Models are nondeterministic; their choice to emit flags is not guaranteed. Provider login challenges and usage limits are outside the extension's control.

## Upload assets

- ZIP: `dist/ai-relay-v0.4.7-chrome-store.zip`. It contains manifest.json at its root.
- Icon: `store/assets/icon-128.png` (128 × 128).
- Screenshot: `store/assets/dashboard-1280x800.png` (1280 × 800). Rendered from the v0.4.7 dashboard with illustrative supported-tab metadata in an isolated preview. This is the actual packaged UI, not a live relay transcript or evidence of provider integration testing.

## Final checks and account steps

- Automated checks: run npm run check, npm test, and npm run format:check on release sources.
- Fresh Chrome profile acceptance: installation, both starting orders, multiple-tab selection, automatic/manual modes, long answers, #stop#, enabled/disabled #userInput#, interjection, export, unrelated-draft protection, rate-limit/sign-in interruptions, extension reload, and browser restart. Record actual observations in ACCEPTANCE.md. Automated mocks are not a substitute for this step.
- Review the providers' applicable terms for this website automation before distribution. Chrome approval does not establish permission from those providers.
- Open https://chrome.google.com/webstore/devconsole in the developer's account. Registration, identity/contact verification, any registration payment, and agreement acceptance must be completed by the account owner when required.
- Create a new item, upload the ZIP, paste the listing/privacy fields, and upload the icon and screenshot. Provide the GitHub privacy policy URL above.
- Initially choose Unlisted distribution for a small beta. This still requires store review.
- Check the final dashboard declarations, submit for review, and record the resulting item URL. No store item or approval is implied by this file.

## Reference documentation

- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/docs/webstore/images
- https://developer.chrome.com/docs/extensions/reference/api/tabs
