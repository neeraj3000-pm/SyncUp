# SyncUp — Product Requirements Document — MVP v1.0

SyncUp
Product Requirements Document — MVP v1.0
Product: SyncUpTagline: Stop debating. SyncUp.Platform: Mobile-first Web App / PWAMVP Categories: Watch 🎬 + Eat 🍔Primary Modes: Couple + GroupPrimary Interaction: Swipe-based preference matchingProduct Philosophy: Frictionless, not rudimentary.

## 1. Product Overview
SyncUp is a social decision-making product that helps two or more people quickly agree on what to watch, where to eat, or eventually what to do together.
Everyone independently reviews the same set of options and makes simple decisions:
Swipe right → Sync
Swipe left → Pass
SyncUp compares everyone's choices and identifies the options with the highest level of agreement.
The product introduces a time limit so that users don't endlessly debate or browse.
The core experience is:
Create → Share → Join → Swipe → Reveal → Act
SyncUp is not intended to become the service that fulfills the final action.
For example:
SyncUp helps you decide what movie to watch.
A streaming service helps you watch it.
Or:
SyncUp helps you decide where to eat.
A maps, ordering or booking service helps you get there/order/book.
SyncUp is the decision layer.

## 2. Product Vision
Make deciding what to do together as easy as deciding what you personally want.
The long-term vision is for SyncUp to become a universal social decision layer across categories:
🎬 Watch
🍔 Eat
🎮 Play
✈️ Go
🎯 Do
🎵 Listen
📚 Read
The product should eventually support almost any situation where multiple people have different preferences and need to reach a decision.

## 3. Core Problem
Groups frequently spend more time deciding than actually doing.
Examples:
"What should we watch?"
"Where should we eat?"
"Which restaurant?"
"What game should we play?"
"Where should we go this weekend?"
Existing solutions tend to fall into one of several categories:
Endless browsing
Group chats and polls
Recommendation feeds
Generic voting tools
Category-specific swipe apps
These approaches either create more discussion or require users to configure too much before getting value.
SyncUp should instead make the decision itself the interaction.

## 4. Product Principles
4.1 Frictionless, not rudimentary
SyncUp should be extremely easy to use without feeling like a stripped-down prototype.
The interface should hide complexity rather than remove useful functionality.

4.2 Complexity belongs in the system, not in the user's way
Underneath the experience, SyncUp may need:
APIs
candidate generation
filtering
location
streaming availability
restaurant data
realtime state
matching algorithms
timers
session management
The user should experience:
Create → Swipe → Sync

4.3 One obvious next action
Every screen should have a clear primary action.
Examples:
Landing → Start SyncUp
Join → Join
Setup → Continue
Lobby → Start
Swiping → Swipe
Finished → Reveal
Results → Act / Re-Sync
If a screen has too many equally important actions, simplify it.

4.4 The 10-second rule
A first-time creator should understand what SyncUp does and be able to begin creating a session within approximately 10 seconds.
A participant should be able to:
Open link → Enter name → Join
within approximately 5–10 seconds.
No account should be required.

4.5 Make the decision feel fun, not the interface feel busy
Motion, imagery, typography and reveal moments should create personality.
Do not add gamification simply for the sake of gamification.
Avoid:
XP
Points
Streaks
Leaderboards
Badges
Artificial rewards
The decision itself is the game mechanic.

## 5. Target Users
Primary
Couples
Two people trying to quickly agree on:
What to watch
Where to eat
What to do
Typical scenario:
"You choose."
"No, you choose."
"Let's just use SyncUp."

Secondary
Friends / Groups
3–10 people trying to make a group decision.
Typical scenarios:
Movie night
Dinner
Weekend outing
Group activity

Future
Families
Colleagues
Travel groups
Event groups
Larger social groups

## 6. MVP Scope
The MVP includes:
Categories
Watch
Movies
Eat
Restaurants
Modes
Couple Mode
Exactly 2 participants
Group Mode
3–10 participants
Core functionality
Create SyncUp
Join via link
Join via code
QR sharing
Guest participation
Movie discovery
Restaurant discovery
Candidate filtering
50-item batches
Swipe left/right
Private choices
Participant progress
2/5/10 minute timer
Early completion
Reveal results
Sync Score
Re-Sync
External action links

## 7. Explicit MVP Non-Goals
Do not build:
Native Android app
Native iOS app
User profiles
Friends/following
Social feed
Chat
In-app messaging
AI recommendation engine
Subscriptions
Advertising
In-app streaming
In-app food delivery
Full restaurant ordering platform
Full travel booking
Advanced gamification
Public profiles
Complex authentication
Push notifications
Loyalty system
These may be considered later.

## 8. Primary User Journey
The canonical SyncUp journey is:
Landing
   ↓
Start SyncUp
   ↓
Choose Category
   ↓
Choose Content Pool
   ↓
Choose Timer
   ↓
Create Session
   ↓
Share Link / Code / QR
   ↓
Participants Join
   ↓
Start Session
   ↓
Swipe
   ↓
Everyone Finishes
   ↓
Reveal Results
   ↓
Act on Result
   ↓
Re-Sync

## 9. Landing Page
Objective
Immediately communicate what SyncUp does and provide two clear paths:
Create a SyncUp
Join an existing SyncUp
Suggested copy
Stop debating. SyncUp.
Find something everyone actually wants to do.
[ Start a SyncUp ]
Already have a code?
[ Join a SyncUp ]
No login required.

## 10. Creating a SyncUp
Step 1 — Choose category
What are you deciding?
🎬 Watch
Movies and more
🍔 Eat
Restaurants and food
For MVP, only Movies and Restaurants need to be functional.
Future categories can be added later.

## 11. Watch Flow
Step 2 — Choose movie pool
What do you want to watch?
All Movies
Browse from the broader available movie pool.
Genres
Examples:
Action
Comedy
Drama
Horror
Sci-Fi
Thriller
Romance
Animation
Collections
Examples:
IMDb Top 50
Christopher Nolan
Quentin Tarantino
Oscar Winners
Cult Classics
Best of the 2000s
The system should be designed around a generic:
Collection → Filter → Candidate Pool
architecture.
Do not hardcode every collection into the frontend.

## 12. Movie Candidate Pool
A SyncUp session should initially receive a batch of approximately 50 candidates.
All participants in the same session should receive the same candidate pool.
The order may be randomized per participant if desired, but the underlying candidate set must remain the same for fair matching.
When a participant reaches the end:
You've seen all 50.
Options:
[ I'm Done ]
[ Show Me 50 More ]
If they request more, the system generates another batch while avoiding previously shown items where possible.

## 13. Food Flow
Step 2 — Choose restaurant preferences
The initial food flow should remain simple.
Potential filters:
Cuisine
Price range
Distance
Restaurant type
Open now
Delivery / Dine-in where supported
Location should be requested only when necessary.
Example:
Where do you want to eat?
Use my location
or
Choose an area
Do not request location permission on the landing page.

## 14. Restaurant Candidate Pool
Restaurant candidates should come from real external data rather than a manually maintained static database.
Each candidate can contain:
Name
Photos
Cuisine
Rating
Price level
Distance
Address
Opening status
Coordinates
External place ID
Ordering availability
Booking availability
The same candidate-pool architecture used for Movies should support Restaurants.

## 15. Timer Selection
How long do you want to decide?
2 min
Quick decision
5 min
Take your time
10 min
Explore a little
Default:
5 minutes
The creator can change the duration before starting.
The timer begins only when the session officially starts.

## 16. Session Creation
After configuration:
[ Create SyncUp ]
The system creates a unique SyncUp session.
Example:
K7XM2
Share URL:
/join/K7XM2
The session receives:
Session ID
Short code
Category
Mode
Candidate pool
Timer duration
Creator
Status

## 17. Sharing
The creator should be able to share through:
Copy Link
Copies the join URL.
QR Code
Displays a QR code containing the join URL.
This is especially useful when people are physically together.
Share Sheet
Where supported, invoke the device's native share functionality.

## 18. Joining a Session
A participant opens the link.
Immediately show:
🎬 Neeraj wants to decide what to watch.
Enter your name.
[ Ananya ]
[ Join SyncUp ]
No account.
No email.
No password.
No app download.

## 19. Category Context
The category must be immediately visible when someone joins.
Examples:
Neeraj wants to decide what to watch 🎬
or
Neeraj wants to decide where to eat 🍔
The participant should never join a generic waiting room without knowing what the session is about.

## 20. Waiting Room
The waiting room displays participants and their status.
Example:
Your SyncUp
Neeraj ✓
Ananya ✓
Rahul — joining...
The creator sees:
[ Start SyncUp ]
Start should require at least 2 participants.
Participants who join after the session has started should be handled according to session state. For MVP, joining after ACTIVE begins should either be disabled with a clear message or supported only before the first session begins.

## 21. Couple Mode
Exactly 2 participants.
Matching is straightforward:
Both Like → 100% Sync
One Like → 50%
Neither Like → 0%
The system should identify unanimous matches first.

## 22. Group Mode
Supports 3–10 participants in MVP.
Example:
5 participants.
If 4 Like an item:
Sync Score = 80%
If all 5 Like:
Sync Score = 100%
Results should prioritize agreement.

## 23. Swipe Experience
This is the primary product interaction.
Card structure
The decision card should show only information needed for a quick decision.
Movie card
Poster
Title
Year
Genre
Runtime
Rating
Streaming availability
Example:
Interstellar
2014 · Sci-Fi · 2h 49m
⭐ 8.7
Netflix · Prime Video

Restaurant card
Main image
Restaurant name
Cuisine
Rating
Price
Distance
Open status
Example:
Toscano
Italian · Indiranagar
⭐ 4.4 · ₹₹
1.8 km
Open now

## 24. Card Details
The card itself should remain simple.
Tapping the card opens a detail view/sheet.
Movie details
Larger poster
Title
Year
Genres
Runtime
Rating
Description
Cast
Director
Streaming providers
Streaming links
Trailer where available
Restaurant details
Photos
Name
Cuisine
Rating
Price
Address
Opening status
Distance
Map/location
Ordering link where supported
Booking link where supported
The user can close the detail view and return to the exact same card.

## 25. Swipe Actions
Swipe right
SYNC ✓
Swipe left
PASS
The card should move with natural physics.
As the card is dragged:
Right movement communicates Sync
Left movement communicates Pass
Small directional feedback appears
The next card is visible underneath
Buttons should also be available as an accessibility/fallback interaction.

## 26. No Maybe
V1 deliberately supports only:
Sync
or
Pass
There is no Maybe option.
This keeps the matching model clear and avoids ambiguous preference data.

## 27. Participant Privacy
Individual choices remain private during active swiping.
Participants may see:
Who has joined
Who is active
Who has finished
Approximate progress
Participants must not see:
What another participant liked
What another participant passed
Another participant's candidate-specific choices
This prevents users from influencing each other.

## 28. Participant Progress
Example:
Syncing...
Neeraj — 23/50
Ananya — 19/50
Rahul — Done
The UI should communicate activity without revealing decisions.

## 29. Completion Behaviour
There are two ways a participant can finish.
Reaching the end of the batch
Show:
You've seen all 50.
[ I'm Done ]
[ Show Me 50 More ]

Voluntarily finishing
A participant can choose I'm Done before exhausting the entire pool.
Their status becomes:
Done ✓
They can no longer influence the active session unless they choose to resume, if that behaviour is later supported.
For MVP, once a participant chooses Done, treat them as finished.

## 30. Everyone Finishes Early
If everyone finishes before the timer expires:
Show:
Everyone's done! 🎉
You still have 1:32 left.
Ready to see what you agreed on?
[ Reveal Results ]
[ Keep Swiping ]
This gives the group control instead of forcing them to wait.

## 31. Timer Behaviour
The timer is server-authoritative.
The server stores:
started_at
expires_at
The client calculates and displays remaining time based on server time.
Do not rely solely on a client-side countdown.
When the timer expires:
The session automatically enters the reveal state.
No additional action should be required.

## 32. Results
Perfect Sync
If everyone liked an item:
YOU'RE SYNCED
Interstellar
⭐ 8.7
2/2 picked it
Netflix · Prime Video
[ Watch Now ]
[ Re-Sync ]
The result should have a short, satisfying reveal animation.

## 33. No Perfect Match
Never frame this as a failure.
Example:
No perfect Sync 😅
But you found some common ground.
Results
Interstellar
100%
The Prestige
75%
Arrival
50%
The highest agreement options are surfaced first.

## 34. Sync Score
The basic MVP formula:
Sync Score = Number of participants who liked the item / Total participants × 100
Examples:
2/2 → 100%
3/4 → 75%
4/5 → 80%
The results ranking should prioritize:
Highest Sync Score
Unanimous matches
Relevant content quality/rating
Stable tie-breaker
The ranking logic should be deterministic enough to avoid results randomly changing between refreshes.

## 35. Results Must Be Actionable
SyncUp should not stop at:
"You agreed on Interstellar."
It should help users take the next step.
Movies
Possible actions:
Watch on Netflix
Watch on Prime Video
View availability
Restaurants
Possible actions:
Get Directions
Order
Book
Only show actions supported by the available provider data.
SyncUp should hand off to external services rather than attempting to become the fulfillment platform.

## 36. Re-Sync
After results:
[ Re-Sync ]
creates another decision session.
The MVP implementation can simply create a new session.
Future enhancement:
Exclude previous result
so the same result does not appear again.

## 37. Movie Data Architecture
Movie content should not be manually hardcoded into the frontend.
Use an external movie/content provider through a server-side service layer.
Architecture:
SyncUp UI
    ↓
Movie Service
    ↓
Movie Data Provider
The provider can supply:
Titles
Posters
Metadata
Genres
Ratings
Cast
Directors
Descriptions

## 38. Streaming Availability
Streaming availability must be modeled separately from the movie itself.
Example:
Movie
Interstellar
External ID: XXXXX
India Availability
Netflix
Prime Video
JioHotstar
This prevents the movie content record from being tightly coupled to a specific streaming provider.
Availability should be location-aware where supported.
Streaming links should be generated/stored from legitimate provider data.

## 39. Restaurant Data Architecture
Restaurant data should similarly sit behind a provider abstraction.
SyncUp UI
    ↓
Restaurant Service
    ↓
Location / Places Provider
The service should normalize provider responses into a common SyncUp restaurant model.
This makes it possible to change or add providers later.

## 40. Generic Category Architecture
SyncUp should not be architected specifically around Movies.
Conceptually:
Category
   ↓
Candidate Provider
   ↓
Candidate Pool
   ↓
Session Items
   ↓
Participant Choices
   ↓
Matching Engine
   ↓
Results
Movies and Restaurants are simply different item types.
Future categories should reuse the same session, participant, swipe and matching infrastructure.

## 41. Suggested Data Model
Users
users
- id
- name
- email nullable
- avatar_url nullable
- created_at
Accounts are not required for MVP participants.

Sessions
sessions
- id
- code
- creator_id nullable
- mode
- category
- title nullable
- duration_seconds
- started_at nullable
- expires_at nullable
- status
- decision_rule
- created_at
Statuses:
WAITING
ACTIVE
COMPLETED
EXPIRED
CANCELLED

Participants
participants
- id
- session_id
- user_id nullable
- display_name
- joined_at
- last_active_at
Guest users can participate without an account.

Items
items
- id
- category
- external_id
- source
- title
- description
- image_url
- metadata
- created_at
- updated_at
metadata can contain category-specific information.

Session Items
session_items
- id
- session_id
- item_id
- position
- batch_number
- created_at

Swipes
swipes
- id
- session_id
- participant_id
- item_id
- direction
- created_at
Direction:
SYNC
PASS
Unique constraint:
session_id + participant_id + item_id

Matches
matches
- id
- session_id
- item_id
- sync_score
- participant_count
- liked_count
- rank
- created_at

## 42. Session Codes
Use short, human-readable codes.
Example:
K7XM2
Avoid ambiguous characters such as:
O / 0
I / 1
S / 5
Codes should be easy to read aloud.

## 43. Guest Identity
Participants do not need accounts.
A guest participant can receive a locally stored identifier.
Example:
guest_participant_id
This allows the application to recognize the participant during the session.
Authentication can be introduced later if persistent profiles become necessary.

## 44. Realtime Architecture
The session requires realtime updates for:
Participant joining
Participant leaving
Participant progress
Participant completion
Session starting
Timer/session state
Reveal state
Suggested architecture:
Supabase Realtime
or an equivalent realtime infrastructure.
The server remains authoritative for important state.

## 45. Recommended MVP Technical Stack
Frontend
Next.js
TypeScript
Tailwind CSS
Mobile-first responsive design.

Backend / Database
Supabase
PostgreSQL
Realtime
Authentication infrastructure if needed later
Storage if required

Hosting
Vercel

QR
Use a standard QR-generation library.

PWA
The MVP should be installable as a PWA where supported.
Do not build native Android/iOS apps initially.

## 46. Service Architecture
Keep external integrations behind services.
Suggested structure:
/services
    /movies
    /streaming
    /restaurants
    /location
    /matching
    /sessions
The UI should not directly call external provider APIs when doing so would expose secrets or tightly couple the frontend to a provider.

## 47. Environment Variables
External API keys must never be exposed in client-side code.
Use server-side environment variables for:
Database
Supabase
Movie provider
Streaming availability provider
Restaurant/place provider
Analytics

## 48. Suggested Frontend Structure
Conceptually:
/app
    /page
    /create
    /join/[code]
    /session/[id]
    /results/[id]
/components
    DecisionCard
    MovieCard
    RestaurantCard
    ParticipantList
    SessionTimer
    SwipeDeck
    ResultCard
    SyncScore
    QRModal
    DetailSheet
/services
    movies
    restaurants
    streaming
    matching
    sessions
The exact structure can change during implementation.

## 49. Design System
Personality
Bold &amp; Energetic with Premium Execution
SyncUp should feel:
Bold
Warm
Social
Modern
Playful
Premium
Avoid:
Generic SaaS aesthetic
Tinder clone aesthetic
Over-gamified children's-app aesthetic

## 50. Color Direction
SyncUp should have its own distinctive palette.
The palette should work across categories rather than being tied to Movies or Food.
Primary
SyncUp Orange / Coral
Used for:
Primary CTA
Active states
Sync actions
Brand
Progress
Secondary
Electric Purple
Used sparingly for:
Gradients
Highlights
Special interactions
Reveal moments
Sync
Branded Green
Reserved primarily for agreement states.
Example:
SYNCED ✓

## 51. Light Theme
Use a warm off-white rather than pure white.
Conceptually:
Warm background
↓
Dark charcoal text
↓
Soft surfaces
↓
SyncUp accent
The interface should feel fresh and social.

## 52. Dark Theme
Dark mode should be a SyncUp-specific visual world rather than generic black mode.
Use:
Deep midnight background
Slightly lighter surfaces
Elevated cards
Strong imagery
Vibrant accent colors
Avoid pure black wherever possible.
The dark theme should feel particularly good for:
Movie sessions
Date nights
Evening restaurant decisions

## 53. Typography
Primary font candidate:
Manrope
Other candidates can be evaluated during implementation:
Plus Jakarta Sans
DM Sans
Inter
Typography should use:
Strong display headings
Clear mobile body text
Compact metadata
Confident CTAs

## 54. Card Design
Cards should have:
Strong imagery
Clear hierarchy
Moderate corner radius
Minimal metadata
Subtle depth
Physical/stacked feeling
Do not overload cards with information.
Principle
The card helps you decide. The detail view helps you investigate.

## 55. Motion
Motion is an important part of SyncUp's personality.
Swipe
Natural physics.
Right swipe
Subtle:
SYNC ✓
Left swipe
Subtle:
PASS
Join
Participant appears smoothly.
Everyone finished
Small celebration.
Reveal
The result should emerge through a short, polished animation.
Avoid excessive confetti and noisy gamification.

## 56. Sync Visual Language
The concept behind the SyncUp brand is:
Multiple people → different choices → convergence → one decision
This can influence:
Logo
Icon
Motion
Sync Score
Reveal animation
Participant indicators
A future Sync Score animation could visually bring participant indicators together around the selected result.

## 57. Accessibility
The application should support:
Large enough touch targets
Text alternatives
Keyboard navigation where relevant
Reduced motion preference
Sufficient color contrast
Swipe buttons as an alternative to gesture-only interaction
Swipe must never be the only way to make a decision.

## 58. Error Handling
The experience should remain simple when things go wrong.
Examples:
Session expired
This SyncUp has ended.
[ Start a New One ]
Invalid code
We couldn't find that SyncUp.
Check the code and try again.
Network interruption
Preserve the current state where possible and show:
You're offline. Reconnecting...
External provider unavailable
Do not block the entire result.
Show the content and omit unavailable external actions.

## 59. Privacy
Minimum requirements:
Guest participants
No unnecessary personal data
Individual choices hidden during active sessions
Session data access limited to participants
External API credentials kept server-side
Avoid exposing participant identifiers unnecessarily
Define a retention policy before production launch.

## 60. Analytics
Track meaningful product behaviour.
Acquisition
Landing page viewed
Start clicked
Join clicked
Creation
Category selected
Movie/restaurant filters selected
Timer selected
Session created
Participation
Invite generated
Join completed
Session started
Swipe recorded
Batch completed
Participant finished
Results
Reveal shown
Perfect match
Partial match
Action clicked
Re-Sync clicked

## 61. Core Product Metrics
The most important MVP metrics should be:
Completed SyncUps
How many sessions reach a result?
Completion rate
What percentage of started sessions reach reveal?
Match rate
How often does a session produce at least one strong agreement?
Action rate
How often does a result lead to:
Watch
Order
Book
Directions
Invite → Join conversion
How often does a shared session actually get joined?
Re-Sync rate
How often do users start another decision after finishing?

## 62. MVP Success Criteria
The MVP is successful if:
Scenario 1
Two people on separate phones can:
Open SyncUp
Create a movie session
Share a link
Join
Swipe independently
See each other's progress
Finish
Reveal
Identify a shared movie
Open the streaming option
without requiring an account.
Scenario 2
Two or more people can repeat the same experience for restaurants.
Scenario 3
A new user can understand the core interaction without needing an onboarding tutorial.

## 63. Product Quality Bar
The MVP should not be judged only on whether the functionality works.
It should feel:
Fast
Responsive
Polished
Visually distinctive
Reliable
Easy to understand
A smaller number of polished flows is preferable to a larger number of unfinished features.

## 64. Design References
The following references are inspiration only.
They should not be copied.
Reference 01
Gen Z/Teens Job Discovery App with Time-Bound Gig Matching
Useful inspiration:
Curated card stack
Decision-first cards
Time pressure
Strong typography
Layered cards
Showing only information necessary for the decision
The reference itself explicitly describes its design around curated stacks, time-bound decisions and decision-first cards.

Reference 02
Winner Dinner — Gamified Food Deciding App
Useful inspiration:
Social decision-making
Food discovery
Group mode
Swipe interaction
Countdown
Bold visual energy
The reference combines group voting, food swiping and a countdown-oriented experience.
Important
SyncUp should not replicate either reference.
Do not copy:
Color palettes
Typography
Illustrations
Exact layouts
Card styling
Icons
Animations
Branding
Instead:
Take the underlying interaction principles and develop an original SyncUp visual system.

## 65. Visual North Star
Bold &amp; Energetic, with Premium Execution.
SyncUp should feel like a product designed around a moment between people, not a database of things.
The content is the movie or restaurant.
The interaction between people is the product.

## 66. Key UX Principle
Make the decision feel fun, not the interface feel busy.

## 67. Key Product Principle
Complexity belongs in the system, not in the user's way.

## 68. Key Brand Principle
Multiple choices. One decision.

## 69. Future Roadmap
After MVP validation:
Phase 2
TV Shows
More restaurant controls
Improved Re-Sync
Better collections
Native share integrations
Improved location experience
Phase 3
🎮 Play
🎯 Do
✈️ Go
Phase 4
🎵 Listen
📚 Read
Phase 5
Potential native applications:
Android
iOS
Potential future capabilities:
Persistent profiles
Friends
Saved preferences
Personalized pools
Smarter recommendations
Notifications
Shared history
These should only be built after the core decision experience proves useful.

## 70. Claude Code Implementation Instructions
Build SyncUp as a mobile-first PWA.
Prioritize the following experience:
Two people can use SyncUp from two phones and decide what movie to watch.
Then extend the same architecture to restaurants.
Do not build every future feature.
The first implementation should focus on:
Landing
Create
Join
Waiting room
Swipe deck
Realtime participant state
Timer
Results
Re-Sync

## 71. Initial Build Order
Sprint 1 — Foundation
Project setup
Design tokens
Responsive shell
Database
Session creation
Guest participant identity
Sprint 2 — Session
Join flow
Waiting room
Realtime participants
Session start
Timer
Sprint 3 — Swipe
Decision card
Swipe interaction
Like/pass storage
50-item candidate pool
Progress
Sprint 4 — Matching
Reveal
Sync Score
Result ranking
Result detail
External action
Sprint 5 — Food
Location
Restaurant provider
Restaurant card
Restaurant details
Restaurant result actions
Sprint 6 — Polish
Animations
Dark theme
Light theme
QR
Error states
Accessibility
Analytics
PWA installation

## 72. First Development Objective
The first milestone is not:
"Build the whole SyncUp platform."
It is:
Two people on two phones can create and join a SyncUp, independently swipe through the same movie pool, and receive a shared result.
Everything else should support getting this experience working and polished.

## 73. Final Product Definition
SyncUp is a:
time-boxed, multi-person decision layer
that turns:
"What should we do?"
into:
Create → Swipe → Sync.
The product starts with Movies and Food, but its underlying architecture is intentionally category-agnostic.
The product's competitive advantage should come from the combination of:
Extremely low friction
Real-world data
Multi-person private preference collection
Time-boxed decision-making
Actionable results
Cross-category architecture
Strong visual identity
Excellent mobile UX
The goal is not to build another recommendation feed.
The goal is to make getting everyone on the same page almost effortless.
