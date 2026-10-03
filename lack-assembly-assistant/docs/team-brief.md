# IKEA LACK Assembly Assistant: shared brief for four teammates and their AIs

## How to use this brief

Send this entire file to every teammate's AI. Then tell that AI: **"You own Block 1", "You own Block 2", "You own Block 3", or "You own Block 4".** The role prompts near the end can be copied directly. Each AI needs the shared context and contracts as well as its own assignment.

This is an implementation proposal based on the agreed product scope. The product requirements below are confirmed; the stack, folder layout, IDs, and contracts are recommended defaults. Adopt them together before coding. If the team changes a shared contract, update the common file and notify every teammate before implementing the change.

Do not build four separate applications. Build four modules in one application. Integrate a working example early, then fill in the complete assembly.

## 1. Product and hackathon context

We are a four-person team participating in a 24-hour hackathon. Some teammates may be new to web development or 3D. We want to make furniture assembly more accessible to first-time builders through interactive visual instructions, small actionable steps, contextual help, and remembered learning needs.

The long-term vision is an app that accepts an IKEA furniture manual and produces a personalized 3D assembly walkthrough. The hackathon version supports **one exact IKEA LACK side table and its complete assembly**, using prepared 3D animations matched to the manual. It does not generate arbitrary furniture geometry from arbitrary PDFs.

### Confirmed user requirements

- Responsive website that works on a laptop and a phone.
- Upload the supported IKEA instruction PDF.
- Recognize the supported manual and interpret its assembly instructions.
- Show the complete assembly through simple instructions and prepared 3D animations.
- Users can rotate, zoom, replay, and navigate between accessible steps.
- Users must explicitly click a check button, labeled **"Step complete"**, before advancing to a new step.
- Clicking an X button, labeled **"I need help"**, keeps the user on the current step and immediately reveals more information.
- Help offers short substeps, focused 3D highlights or animation segments, help choices, and a text chat field.
- Remember the specific skill or action the user had difficulty with.
- Automatically show additional detail when a later step involves that skill.
- Preserve learning needs across build sessions. Demonstrate this by restarting the same supported build.
- The complete LACK assembly is in scope. The previous ALEX and RELATERA desks are no longer in scope.

### What makes the demo compelling

The user says, "I can't line up the leg with the screw." The app gives a focused alignment explanation, highlights the relevant leg and fastener, and saves `leg_alignment` as a learning need. On the next leg, alignment guidance appears automatically. In a second build session, that preference is still present.

The user sees a useful assembly assistant. The differentiating behavior is that help changes future guidance, instead of being a disconnected chat conversation.

## 2. Supported product and authoritative instructions

Supported product:

- IKEA LACK side table, white, 21 5/8 x 21 5/8 inches.
- Product/article number: **304.499.08**.
- Product page: https://www.ikea.com/us/en/p/lack-side-table-white-30449908/
- Recommended supported PDF: https://www.ikea.com/us/en/assembly_instructions/lack-side-table-white__AA-2606170-1-100.pdf
- PDF document identifier: **AA-2606170-1**.

The product page also links an older one-page document, AA-207276-4. For the MVP, support the recommended PDF above; reject other versions unless Block 3 deliberately adds and verifies them. Do not silently assume every file named LACK is interchangeable.

The recommended PDF was inspected for this brief. Its first page depicts four double-ended fasteners, labeled **115980**, followed by attaching the legs through a turning motion. It also depicts protecting the table surface during assembly. The remaining pages include multilingual usage warnings. This is a diagram-heavy document: its text layer alone does not describe the assembly sequence in plain English.

Important consequences:

- The app must interpret diagrams, not merely extract PDF text.
- The four similar leg operations can become separate app steps even though the manual compresses them into one diagram.
- Do not invent drawer slides, Allen-key operations, or screwdriver operations. The screwdriver example from early brainstorming was hypothetical; this manual depicts hand turning.
- Number of turns, exact thread pitch, fastener depth, and part thickness are not established by this brief. Do not present animation timing or estimated dimensions as measured assembly specifications.
- Recheck the diagram before finalizing which piece receives each end of a fastener and the direction of rotation from the displayed viewpoint.
- Preserve relevant manufacturer usage guidance in the completed-build screen. Summarize it rather than flooding each assembly step with unrelated text.

Source links should remain available in the app. The original manual is the authority; the app's smaller steps are explanatory expansions. Tag preparation and final checks as additional guidance when they go beyond the illustrated assembly actions.

## 3. Recommended architecture

Use a single repository with:

- **Frontend:** React, TypeScript, Vite.
- **3D:** Three.js through React Three Fiber and Drei.
- **Server:** a small Node/Express TypeScript service for manual processing and AI help.
- **User memory:** browser localStorage, managed by one module.
- **AI:** a model/provider the team already has access to, called only from the server.
- **Validation:** a small runtime schema validator such as Zod, or equivalent explicit validation.

These are defaults, not requirements to install unneeded infrastructure. Lock dependency versions in one shared lockfile. Block 1 owns setup and dependency changes; teammates request new dependencies rather than independently replacing the project configuration.

Use one browser profile for the hackathon demo. There is no account system, cross-device sync, or cloud profile database in the MVP. Explain the memory scope accurately: it persists on this browser/device.

Suggested layout:

```text
src/
  App.tsx
  shared/
    contracts.ts
  features/
    assembly-ui/          # Block 1
    viewer/               # Block 2
      AssemblyViewer.tsx
      animationRegistry.ts
      sceneStates.ts
    instructions/         # Block 3 frontend API adapter
      instructionService.ts
    profile/              # Block 4
      profileStore.ts
      adaptation.ts
  data/
    lack-guide.v1.json    # Block 3; reviewed with Block 2
server/
  index.ts
  instructions/          # Block 3
public/
  assets/lack/            # Block 2 optional model assets
docs/
  demo-checklist.md
```

Block 1 owns the main app state and composition. Block 2 does not import profile storage. Block 3 does not own the 3D scene. Block 4 does not directly change the instruction catalog. Dependencies flow through shared data contracts.

## 4. Shared vocabulary and identifiers

Use these terms consistently:

| Term | Meaning |
| --- | --- |
| Guide | Versioned ordered instructions for the supported product |
| Step | An actionable assembly unit requiring the parent check button |
| Substep | A smaller explanation within a parent step; no separate assembly progress |
| Animation | A prepared visual sequence referenced by an ID |
| Part | A named object in the 3D scene |
| Skill | A reusable action such as aligning a leg, independent of step number |
| Build session | Assembly progress for one attempt |
| User profile | Learning needs retained across build sessions |
| Help event | One request for help and its confirmed/classified difficulty |

Proposed stable identifiers:

- Product ID: `ikea-lack-30449908`.
- Guide ID: `lack-aa2606170-v1`.
- Manual ID: `AA-2606170-1`.
- Parts: `tabletop`, `leg-1` through `leg-4`, `fastener-1` through `fastener-4`.
- Step IDs and animation IDs: use the catalog below.
- Skill IDs: `part_identification`, `part_orientation`, `fastener_alignment`, `leg_alignment`, `hand_tightening`.

Do not use arbitrary step numbers as learning categories. Do not add `screwdriver_use` to LACK steps just to match the earlier example. Future products may add skills through a deliberate contract update.

## 5. Canonical shared TypeScript contracts

Put these definitions in `src/shared/contracts.ts`. This is the proposed v1 contract; it replaces the shorter illustrative types discussed earlier. Every block imports the same definitions rather than defining incompatible duplicates.

```ts
export type SkillId =
  | "part_identification"
  | "part_orientation"
  | "fastener_alignment"
  | "leg_alignment"
  | "hand_tightening";

export type PartId =
  | "tabletop"
  | "leg-1" | "leg-2" | "leg-3" | "leg-4"
  | "fastener-1" | "fastener-2" | "fastener-3" | "fastener-4";

// Strings must also be checked against the prepared animation registry.
export type AnimationId = string;

export interface ManualReference {
  documentId: string;
  page: number; // Human-readable PDF page, starting at 1.
  basis: "manual_diagram" | "supplementary_guidance";
}

export interface InstructionSubstep {
  id: string;
  instruction: string;
  animationId: AnimationId;
  highlightedPartIds: PartId[];
  skills: SkillId[];
}

export interface AssemblyStep {
  id: string;
  order: number; // Zero-based, consecutive.
  title: string;
  instruction: string;
  completionCheck: string; // Observable check the user performs.
  source: ManualReference;
  animationId: AnimationId;
  highlightedPartIds: PartId[];
  skills: SkillId[];
  substeps: InstructionSubstep[];
}

export interface AssemblyGuide {
  schemaVersion: 1;
  id: string;
  productId: string;
  productName: string;
  productArticleNumber: string;
  manualDocumentId: string;
  manualUrl: string;
  guideVersion: string;
  parts: { id: PartId; label: string }[];
  steps: AssemblyStep[];
  usageNotes: string[];
}

export interface LearningNeed {
  helpEventCount: number;
  lastObservedAt: string; // ISO timestamp.
}

export interface UserProfile {
  schemaVersion: 1;
  id: string;
  learningNeeds: Partial<Record<SkillId, LearningNeed>>;
}

export interface BuildSession {
  id: string;
  productId: string;
  guideId: string;
  guideVersion: string;
  startedAt: string;
  completedStepIds: string[];
  viewedStepId: string;
}

export type HelpChoice = SkillId | "other";

export interface HelpRequest {
  requestId: string; // Reuse for retries of this same help event.
  guideId: string;
  stepId: string;
  choice?: HelpChoice;
  message?: string;
  relevantLearningNeeds: SkillId[];
}

export interface HelpResponse {
  requestId: string;
  guideId: string;
  stepId: string;
  explanation: string;
  substeps: InstructionSubstep[];
  difficulty: {
    skillId: SkillId | null;
    status: "confirmed" | "needs_confirmation" | "unknown";
  };
  origin: "ai" | "prepared_fallback";
}

export interface AdaptationResult {
  expanded: boolean;
  matchedSkills: SkillId[];
  reason: string | null;
}

export interface ApiError {
  code:
    | "INVALID_PDF"
    | "UNSUPPORTED_MANUAL"
    | "PROCESSING_FAILED"
    | "INVALID_HELP_REQUEST"
    | "HELP_UNAVAILABLE";
  message: string;
}
```

Keep the UI's loading/error state outside these product data types. Do not put provider keys, raw uploaded PDF bytes, or complete chat history into `UserProfile`.

## 6. Proposed app assembly catalog

This catalog is an explanatory expansion of the manual, not the manufacturer's numbered step list. Block 3 must verify its wording against the first-page diagram before shipping. Block 2 must agree on the visual interpretation. Preparation and final checks are app guidance.

| Order | Step ID | Purpose | Main animation ID | Main skill tags |
| --- | --- | --- | --- | --- |
| 0 | `prepare` | Identify parts and place tabletop underside up on a protected surface | `prepare-overview` | part identification, orientation |
| 1 | `fastener-1` | Start the first double-ended fastener in the tabletop hole | `fastener-1-insert` | fastener alignment, hand tightening |
| 2 | `leg-1` | Align and hand-turn the first leg onto its fastener | `leg-1-attach` | leg alignment, hand tightening |
| 3 | `fastener-2` | Repeat fastener placement at the second corner | `fastener-2-insert` | fastener alignment, hand tightening |
| 4 | `leg-2` | Attach the second leg | `leg-2-attach` | leg alignment, hand tightening |
| 5 | `fastener-3` | Place the third fastener | `fastener-3-insert` | fastener alignment, hand tightening |
| 6 | `leg-3` | Attach the third leg | `leg-3-attach` | leg alignment, hand tightening |
| 7 | `fastener-4` | Place the fourth fastener | `fastener-4-insert` | fastener alignment, hand tightening |
| 8 | `leg-4` | Attach the fourth leg | `leg-4-attach` | leg alignment, hand tightening |
| 9 | `upright` | Carefully turn the assembled table upright | `table-upright` | part orientation |
| 10 | `final-check` | Check the assembled table and show relevant usage notes | `table-final` | none required |

App-added checks must remain modest and physically appropriate. Do not invent a torque specification or instruct users to force a stuck fastener.

Substep animation naming:

- Fastener: `fastener-N-align`, `fastener-N-start`, `fastener-N-tighten`.
- Leg: `leg-N-align`, `leg-N-start`, `leg-N-tighten`.
- Preparation and final steps may reuse their main animation with different highlights.

Each substep animation is a complete, reproducible clip with its own baseline scene. Do not make it depend on the user having watched another animation first.

Suggested alignment help content: identify the hole, bring the relevant part into position, keep it aligned while starting the connection. Suggested tightening help: show the hand-turn motion clearly, explain the endpoint using verified guidance, and offer a replay. Final wording and rotation arrows need review against the manual.

### Example step object

This is illustrative wording; it is not a substitute for the final manual review.

```json
{
  "id": "leg-1",
  "order": 2,
  "title": "Attach the first leg",
  "instruction": "Align the hole in the leg with the exposed fastener, then turn the leg by hand to attach it.",
  "completionCheck": "Check that the leg is attached and aligned with the tabletop corner.",
  "source": {
    "documentId": "AA-2606170-1",
    "page": 1,
    "basis": "manual_diagram"
  },
  "animationId": "leg-1-attach",
  "highlightedPartIds": ["leg-1", "fastener-1"],
  "skills": ["leg_alignment", "hand_tightening"],
  "substeps": [
    {
      "id": "leg-1-align",
      "instruction": "Find the hole at the attachment end of the leg and align it with the exposed fastener.",
      "animationId": "leg-1-align",
      "highlightedPartIds": ["leg-1", "fastener-1"],
      "skills": ["leg_alignment"]
    },
    {
      "id": "leg-1-start",
      "instruction": "Keep the leg aligned as you start turning it by hand.",
      "animationId": "leg-1-start",
      "highlightedPartIds": ["leg-1", "fastener-1"],
      "skills": ["leg_alignment", "hand_tightening"]
    },
    {
      "id": "leg-1-tighten",
      "instruction": "Continue the hand-turn motion shown in the animation, then check the connection.",
      "animationId": "leg-1-tighten",
      "highlightedPartIds": ["leg-1"],
      "skills": ["hand_tightening"]
    }
  ]
}
```

## 7. Block 1: interface, app state, and integration

**Owner:** Person 1, also acting as integration lead.

### Own these responsibilities

1. Initialize the shared project and common contracts.
2. Build upload, manual-loading, assembly, help, and completion screens.
3. Compose the viewer, instruction service, and profile module.
4. Own selected step, active help substep, pending requests, errors, and navigation rules.
5. Add keyboard and touch-friendly controls with visible labels.
6. Coordinate branch merges, environment configuration, and final demo setup.

### Assembly screen

- Laptop: viewer beside the instruction panel.
- Phone: viewer above the panel, with controls usable without horizontal scrolling.
- Show product name, step title, progress, one main instruction, and the completion check.
- Show Rotate/Zoom guidance, Replay, Reset view, Previous, and Next.
- Use **"Step complete"** with a check icon and **"I need help"** with an X icon. Symbols alone are ambiguous.
- Keep new steps locked until prerequisites are checked.
- Show relevant substeps immediately when help opens; AI refinement may load afterward.
- Do not make the user wait for a network response before seeing any help.

### Navigation rules

Find the first incomplete step in guide order. A user can view all completed steps and this first incomplete step. Later steps stay locked. Completion of an animation never marks an assembly step complete.

Clicking the check on the first incomplete step marks it complete and moves to the next step. Clicking it on an already completed step can navigate forward to an accessible step, but must not skip a still-incomplete prerequisite.

Viewing an earlier step changes the scene being illustrated; it does not undo saved assembly progress. Keep `viewedStepId` separate from the completion frontier. Clicking X never changes completion state.

### State integration sequence

1. Upload PDF through Block 3's adapter.
2. Load validated guide.
3. Load/create the matching build session through Block 4.
4. Calculate accessible steps and the selected step.
5. Ask Block 4 whether the selected step should expand.
6. Display the main instruction or prepared substeps, with a short personalization note when appropriate.
7. Pass step ID, animation ID, and highlights to Block 2.
8. On X, open prepared help; on help choice/chat submission, request contextual help.
9. Display a response only if its guide/step/request still matches the active request.
10. Record a difficulty through Block 4 only when confirmed.
11. On check, mark progress through Block 4 and navigate.

If an old AI response arrives after the user has switched steps, ignore it for the active panel. Abort it when possible. Do not attach the response to the new step.

### Deliverables and acceptance

- Complete UI flow works with mock data before the other blocks finish.
- No bypass of completion gates through the step picker or Next button.
- Loading, invalid-upload, AI-failure, viewer-failure, and success states are understandable.
- Reload resumes the active build.
- Second session starts at preparation and retains personalization.
- All four modules are integrated in one runnable app.

## 8. Block 2: 3D parts, animations, and viewer

**Owner:** Person 2.

### Own these responsibilities

- Build a recognizable LACK tabletop, four legs, and four fasteners.
- Implement every catalog animation and substep clip.
- Supply stable part IDs and an animation registry.
- Provide mouse/touch orbit, zoom, replay, reset view, pause/play, and highlights.
- Ensure every animation reconstructs its baseline deterministically.

Use procedural boxes and simple fastener geometry if faster than Blender. Thread detail is optional; a simplified double-ended fastener should communicate the connection. Prioritize orientation and movement clarity over photorealism.

Use meters in scene coordinates, Y up, X/Z in the tabletop plane. The product's overall dimensions are a reference; estimate unprovided thicknesses and local details consistently without claiming manufacturing accuracy. Freeze a labeled diagram of corner positions so all leg numbering agrees. Block 3 uses the same IDs in its text/highlights.

### Component contract

```ts
export interface AssemblyViewerProps {
  guideId: string;
  stepId: string;
  animationId: string;
  highlightedPartIds: PartId[];
  replayToken: number; // Increment to replay the same selected clip.
  onAnimationFinished?: () => void;
  onViewerError?: (message: string) => void;
}
```

Export one named `AssemblyViewer` component. It owns camera controls and its internal playback state. `onAnimationFinished` informs the UI only; it does not complete the physical assembly step.

Also export a lightweight animation registry that the instruction service can validate against without importing WebGL or React. A `hasAnimation(id)` function and the list of supported IDs are enough.

### Scene reconstruction rules

The scene is an instructional simulation, not a detector of the physical table. Render the setup needed for the selected step. For `leg-3`, legs 1 and 2 are attached in the baseline; the third connection is animated. For a prior step, reconstruct that earlier baseline.

Changing steps, choosing a help clip, or replaying must not accumulate transforms. Replaying the same clip repeatedly should never duplicate a leg or rotate it farther each time. Define start/end transforms and interpolate based on normalized time.

Help clips may use a temporary camera focus to make the connection visible. Avoid unexpectedly fighting the user's camera while they are orbiting. Replay should normally preserve the user's view; Reset view restores the recommended camera.

Use arrows/outlines and labels along with highlight color. An animation should remain understandable without relying solely on color. Camera orbit is not assembly rotation: turning the user's view must not alter part placement.

### Deliverables and acceptance

- Every referenced animation ID exists.
- All four leg operations are distinct and affect the correct parts.
- Main clips and focused clips show the same physical operation.
- Replay, step switching, and browser resize work reliably.
- Drag/touch rotation and zoom work on laptop and phone.
- The final scene shows the complete table upright.
- A missing animation reports an error and leaves textual guidance usable.

## 9. Block 3: manual recognition, interpretation, and contextual help

**Owner:** Person 3.

### Own these responsibilities

- Build the reviewed instruction catalog from the exact supported PDF.
- Implement upload recognition and the manual-loading endpoint.
- Interpret diagram actions using visual inspection and, when available, a vision-capable AI.
- Map recognized actions to prepared step/animation IDs; verify the mapping with Block 2.
- Build help choices, prepared help content, and AI-assisted explanation refinement.
- Validate all model outputs before returning them.
- Export a frontend service adapter with the agreed contracts.

### Practical PDF strategy

This manual is mostly diagrams. A basic PDF text extractor may find document IDs and warnings but will not recover the assembly actions. Start with a manually reviewed catalog created from the diagram. This is the reliable source of physical instructions and animation mapping.

For recognition, compute a byte hash of the exact downloaded demo PDF and register it against the supported guide. Exact hash matching is sufficient for the first vertical slice. Reject a changed or unknown PDF with an understandable message. Do not accept a PDF based only on filename, "IKEA", or "LACK" appearing in its text.

After that works, add upload-time diagram interpretation with a vision model if feasible. Supply the first page image or use a provider with actual PDF visual support. Have the model return structured action descriptions, then map them to the reviewed catalog. Do not allow unvalidated output to create new geometry, reorder physical assembly, or reference unknown animations.

Be transparent about what is implemented. If uploaded instructions are actually interpreted at runtime, describe that behavior. If recognition selects a prepared reviewed guide, say so; do not claim arbitrary live PDF-to-3D generation. Runtime AI extraction is a stretch milestone if it threatens the complete demo.

Accept only PDFs and use a small upload size limit such as 10 MB. Validate on the server, not just through a browser file input. Keep upload processing temporary; the demo does not need a permanent PDF storage service.

### API and frontend adapter

```text
POST /api/manuals/recognize
Content-Type: multipart/form-data
Field: file
Success: { guide: AssemblyGuide }
Failure: { error: ApiError }

POST /api/help
Content-Type: application/json
Body: HelpRequest
Success: { help: HelpResponse }
Failure: { error: ApiError }
```

```ts
loadManual(file: File, signal?: AbortSignal): Promise<AssemblyGuide>
getHelp(request: HelpRequest, signal?: AbortSignal): Promise<HelpResponse>
```

Use the adapter in real and mock mode so Block 1 does not depend on provider-specific details. Resolve the guide/step server-side rather than trusting user-submitted instructions.

### Help behavior

Provide relevant categories for the current step: identifying a part, orienting it, aligning the fastener, aligning the leg, hand tightening, or Other. A selected category relevant to the current step is confirmed. If free text suggests a category, ask a small confirmation before persisting it. Unknown requests can receive help without inventing a learning category.

The model receives current reviewed instruction, substeps, permitted part IDs, permitted animation IDs, relevant skill IDs, issue text, and relevant learning needs. It can explain existing actions more clearly and select existing focused clips. Its job is not to invent repair procedures or claim to see the user's physical assembly.

Help output should use short actionable sentences. Keep a response to a small set of substeps. Validate guide ID, step ID, request ID, skill IDs, animation IDs, and part IDs. Return prepared help if output is malformed, outside the catalog, or unavailable.

Treat uploaded/manual content and user text as input data, not instructions that can override server behavior. Keep provider secrets only in server environment variables. Do not put an API key into a Vite-prefixed browser variable.

### Deliverables and acceptance

- Supported PDF resolves to the correct reviewed guide.
- Unsupported, corrupt, or warning-only documents are not mistaken for the assembly guide.
- Whole assembly has verified instructions, source references, and substeps.
- Help references existing clips and correct parts.
- Prepared fallback works when no API key/network/model response is available.
- AI-generated wording never changes completion state or the learning profile directly.

## 10. Block 4: profile memory, progress, and adaptive detail

**Owner:** Person 4.

### Own these responsibilities

- Store a local user profile and a separate active build session.
- Record confirmed difficulties using reusable skill IDs.
- Save checked steps and the selected step.
- Determine when a step should open with additional detail.
- Resume after reload and start new builds without erasing learning needs.
- Provide a small view of saved learning needs and an explicit reset-memory action.

Recommended keys: `assembly-assistant:profile:v1` and `assembly-assistant:session:v1`.

### Module API

```ts
loadProfile(): UserProfile
loadOrCreateSession(guide: AssemblyGuide): BuildSession
saveViewedStep(sessionId: string, stepId: string): BuildSession
completeStep(sessionId: string, stepId: string): BuildSession
recordDifficulty(input: {
  eventId: string;
  sessionId: string;
  guideId: string;
  stepId: string;
  skillId: SkillId;
}): UserProfile
getAdaptation(step: AssemblyStep, profile: UserProfile): AdaptationResult
startNewBuild(guide: AssemblyGuide): BuildSession
resetLearningNeeds(): UserProfile
```

Implementation may use a hook/store internally, but expose one agreed integration surface. Return updated values so Block 1 can rerender. Do not write to localStorage from the viewer or instruction service.

### Adaptation algorithm

For MVP, one confirmed help event is sufficient to trigger more detail. Match the current step's `skills` to profile learning needs with `helpEventCount > 0`. If there is a match, return `expanded: true`, the matching skills, and a brief reason such as "Extra alignment guidance is shown based on your earlier request."

Block 1 initially opens the relevant substeps, or all short substeps if that is simpler. Still allow the user to collapse details. Automatically expanding guidance does not block normal completion or require additional confirmation.

Do not call users bad at a skill, diagnose a condition, or assume incapacity. Store observable help requests, not judgments. Do not remove a learning need merely because the next step was checked; completion is not proof of mastery.

### Persistence and progress rules

- Clicking X by itself does not identify a specific difficulty.
- Confirmed category selection or confirmation of a text-derived category records one event.
- Retries, rerenders, or reopening the same response do not count the same event twice. Keep a small persisted set of processed event IDs in the storage envelope.
- `completeStep` is idempotent and enforces guide order.
- Unknown step IDs and skills are rejected.
- `saveViewedStep` respects accessible-step rules.
- New build generates a new session ID and clears completion/view state; profile stays.
- Reset learning needs clears the profile's skill history; it should not unexpectedly undo current build progress.
- Associate session progress with guide ID/version. If a new guide version is incompatible, start a fresh session while retaining skill memory.
- Catch corrupted JSON and unavailable storage. Recover to a usable in-memory session and tell the UI whether persistence is unavailable.

### Deliverables and acceptance

- Alignment help at leg 1 expands guidance at leg 2.
- Reload preserves both progress and confirmed learning needs.
- New build starts at preparation with remembered detail preferences.
- Same help event cannot increment the count repeatedly.
- Help for part orientation does not expand unrelated hand-tightening guidance.
- Reset memory works and requires a deliberate UI action.

## 11. Integration and repository rules

Use branches such as `feature/app-ui`, `feature/3d-viewer`, `feature/manual-help`, and `feature/profile-memory`. Each person primarily edits their owned directories. Block 1 owns App, build config, contracts, global styles, and lockfile changes. Block 3 owns the guide catalog but reviews every animation reference with Block 2.

Before building:

1. All teammates read this brief.
2. Download and inspect the exact PDF together.
3. Agree on step IDs, part IDs, animation IDs, and numbering of the corners.
4. Commit the shared types and a sample guide fixture.
5. Define the common development commands and server port. A typical setup proxies `/api` from Vite to the local server, avoiding frontend-specific API URLs.
6. Each block implements its agreed exports using mock data first.

Build the first vertical slice within about three hours: one step renders in the app, one animation plays, X reveals substeps, a confirmed help choice saves a skill, and a second similar step reads that skill. Then replace placeholders without changing the contracts.

Do not wait until hour 18 for the first merge. Merge small working changes regularly. Before merging, run the shared build/type check and the relevant behavioral checks. If changing a type or ID is unavoidable, announce it and update the shared fixture first.

If two versions of a contract exist, the repository's `src/shared/contracts.ts` is authoritative. This brief records the starting proposal; it must not override an explicit later team decision.

## 12. AI instructions common to every block

When a teammate gives this brief to an AI, that AI should:

1. Identify the assigned block and summarize its concrete deliverable.
2. Inspect the existing repository and shared contracts before creating files.
3. Work within the assigned directories; coordinate shared-file changes.
4. Use the common IDs and contracts, and provide mocks for unavailable dependencies.
5. Build actual reusable code rather than a standalone lookalike app.
6. Distinguish verified manual facts, app-added guidance, and approximate visual geometry.
7. Keep the complete assembly, help, and memory path the priority.
8. Provide exact exports, dependencies, configuration needs, and integration instructions.
9. Check important behavior, not just whether the screen renders.
10. Finish with changed files, how to run the module, checks performed, and remaining blockers.

An AI should not silently broaden scope, change frameworks, rename shared IDs, or introduce accounts/databases. If blocked by another module, build against its mock contract and report the exact dependency.

## 13. Copyable role prompts

### Person 1 prompt

> You own Block 1 of the attached IKEA LACK Assembly Assistant brief: React interface, app state, and integration. Read the whole brief before coding. Inspect the repository and import the shared contracts. Build the upload, assembly, contextual-help, and completion screens. Compose the viewer from Block 2, instruction adapter from Block 3, and memory API from Block 4. Use mocks until those modules are available. Enforce explicit check-to-advance, allow revisiting completed steps, and keep help on the current step. Ignore stale asynchronous help responses. Make the layout usable on phone and laptop with labeled buttons. You own setup and shared configuration, but coordinate any contract changes. Deliver runnable code and clear integration instructions, not an isolated app.

### Person 2 prompt

> You own Block 2: the reusable React Three Fiber assembly viewer. Read the whole brief and match its part IDs, step IDs, animation IDs, and viewer props exactly. Model the LACK tabletop, four legs, and four double-ended fasteners with simple procedural geometry. Implement the complete catalog and focused help clips, with deterministic baseline scenes for every replay and step switch. Include orbit, zoom, replay, reset view, and part highlights. Verify the joining and turning action against the specified manual; do not invent screwdriver use. Export a lightweight animation registry for validation. Do not build a separate app, own progress, or access profile storage. Deliver the component, registry, scene definitions, and important viewer checks.

### Person 3 prompt

> You own Block 3: manual recognition, reviewed instruction catalog, and contextual AI help. Read the whole brief. Inspect the exact LACK PDF; text extraction alone is insufficient because the assembly is diagram-based. Build and verify the complete catalog with Block 2's animation registry. Implement the agreed upload/help endpoints and frontend adapter. Start with exact PDF hash recognition selecting the reviewed guide, then add validated runtime visual extraction only if feasible. Clearly distinguish prepared matching from live extraction. Help may refine explanations and select existing clips, but cannot invent assembly actions or animation IDs. Include relevant help choices, difficulty confirmation for free text, runtime output validation, and prepared fallback. Keep keys on the server and provide mock responses for integration.

### Person 4 prompt

> You own Block 4: browser profile memory, build progress, and adaptive guidance. Read the whole brief and use the shared contracts and skill IDs. Implement a separate profile and build session with versioned localStorage. Record only confirmed difficulty categories, deduplicate help events, enforce ordered/idempotent completion, and retain learning needs when a new build starts. Implement getAdaptation so one prior confirmed matching help event automatically expands relevant future guidance. Expose the agreed module API to Block 1; do not change viewer code or instruction catalog. Handle reload, corrupt storage, incompatible guide versions, and reset-memory behavior. Provide a deterministic demonstration and integration instructions.

## 14. 24-hour milestones and priority order

| Time | Goal |
| --- | --- |
| Hours 0–1 | Manual review, repo setup, contracts, IDs, sample fixture |
| Hours 1–3 | First integrated vertical slice using mocks |
| Hours 3–10 | Full assembly catalog, all main animations, UI navigation, memory |
| Hours 10–15 | Focused help clips, contextual explanations, robust fallbacks |
| Hours 15–19 | Full integration, upload recognition, reload and second-session checks |
| Hours 19–22 | Phone/keyboard checks, fix failures, polish |
| Hours 22–24 | Feature freeze, demo rehearsal, presentation |

Priority order:

1. Whole supported assembly with correct prepared instructions and 3D clips.
2. Check-gated navigation and immediate smaller-step help.
3. Confirmed skill memory that changes future guidance.
4. PDF recognition and source references.
5. Contextual AI explanation refinement.
6. Live diagram interpretation from the uploaded supported PDF.
7. Visual polish after the core path works.

If behind schedule, keep the complete assembly and personalization path. Simplify materials, animation detail, chat styling, and live extraction. Keep a clearly labeled sample-guide path if upload processing is unavailable; do not fake successful PDF processing.

## 15. Shared acceptance checklist

The demo is done only when these behaviors work in the integrated app:

- [ ] Exact supported PDF loads the right product and guide.
- [ ] Unrelated, invalid, or oversized PDF produces a useful error.
- [ ] Every assembly action is covered, with an accurate explanation and a corresponding clip.
- [ ] All step and substep animation IDs resolve in the registry.
- [ ] Rotate, zoom, replay, reset view, and step navigation work.
- [ ] New steps cannot be reached before the prerequisite check.
- [ ] Animation completion does not complete physical assembly.
- [ ] X reveals help without completing or leaving the step.
- [ ] Help highlights the correct parts and breaks down the actual current action.
- [ ] A confirmed leg-alignment request is remembered.
- [ ] A later leg step automatically expands relevant guidance.
- [ ] Old help responses cannot overwrite a different step's panel.
- [ ] Reload restores build progress and learning needs.
- [ ] New build clears progress while preserving learning needs.
- [ ] Unknown category or malformed AI output does not corrupt the profile or viewer.
- [ ] AI failure still provides prepared help.
- [ ] Controls have visible text, focus indicators, and reasonable touch targets.
- [ ] Repeated replay/navigation causes no drifting or duplicated geometry.
- [ ] Final screen shows completion and appropriate manufacturer usage notes.

Use meaningful focused tests for ordered progress, deduplication, adaptation, and response validation. Validate catalog IDs against the animation registry. Use a short manual walkthrough for visual behavior. Run the agreed build/type check before the final demo.

## 16. Suggested demo script

1. Start with a fresh demo profile and upload the exact supported manual.
2. Show that the guide is for LACK and that the source document is available.
3. Rotate/zoom the scene, watch preparation, and click Step complete.
4. Complete the first fastener step and open the first leg step.
5. Click I need help; select leg alignment or type a difficulty and confirm the suggested category.
6. Show the highlighted connection and smaller alignment instructions.
7. Complete that step and move through the next fastener to leg 2.
8. Show alignment detail appearing automatically, with a short explanation.
9. Complete the rest of the table or move through the remaining checked sequence during the presentation.
10. Start a new build session. Show progress reset and remembered detail when reaching a relevant step.

Keep presentation claims precise: the demo supports one complete product with prepared 3D assets and persistent local personalization. A future system could support more products with reviewed assets and more capable manual interpretation. This demo does not demonstrate reliable arbitrary manual-to-3D generation or cross-device learning.

## 17. Immediate next actions

Assign each person a block. Give every AI this whole file plus its role prompt. Put the agreed contracts and the first step fixture in the shared repository. Have each teammate produce its smallest working export, then connect those exports before expanding the implementation.

The earliest success is not four finished modules. It is one step that renders, animates, offers useful help, remembers a confirmed difficulty, and changes the next relevant step.

## Sources

The following IKEA sources were checked while preparing this brief. The instructions and counts above are summarized, not reproduced verbatim.

- Product: https://www.ikea.com/us/en/p/lack-side-table-white-30449908/
- Selected assembly PDF, diagram and usage information: https://www.ikea.com/us/en/assembly_instructions/lack-side-table-white__AA-2606170-1-100.pdf
- Older alternate assembly sheet linked by the product page: https://www.ikea.com/us/en/assembly_instructions/lack-side-table-white__AA-207276-4-1.pdf
