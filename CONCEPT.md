# Mixture of Agents Application Concept

## Architecture and Tech Stack
* **Framework:** SvelteKit.
* **Database:** PostgreSQL with Drizzle ORM and Zod for validation.
* **AI Integration:** Vercel AI SDK for parallel streaming.
* **Model Provider:** models.dev API for dynamic model fetching.

## Database Schema
* **Users:** Includes role-based access control. Initially seeded with one Admin account and one Demo account to allow for easy future expansion.
* **API Keys:** Stored with AES encryption and linked to the user ID.
* **Generations:** Saves the original prompt, configuration parameters, all intermediate responses, and the final judge output for history persistence.
* **Settings:** Stores the dynamic system prompts configured by the admin and the allowed models for the demo account.

## Authentication and Demo Mode
* **Login Screen:** Features a standard admin login and a "Login as Demo" button for one-click access without credentials.
* **Demo Restrictions:** The demo account only has access to a pre-selected list of low-cost or free models. The admin configures this list in the dashboard. Users on the demo account cannot enter their own API keys.

## Core Mixture of Agents Engine
1. **Initialization:** The user selects 2 to 4 standard models, 1 judge model, and sets the number of intermediate review rounds.
2. **Phase 1 (Independent):** The standard models process the user prompt simultaneously. If a model times out or fails, the system drops it and continues with the successful outputs.
3. **Intermediate Rounds:** The standard models receive the `{{original_prompt}}` and the `{{previous_answers}}` from the prior round to generate refined responses.
4. **Final Phase:** The judge model evaluates the last set of intermediate answers and streams the definitive output.

## User Interface and Experience
* **Design System:** Minimalist, high contrast digital aesthetic. Use black, white, and slate gray palettes to maintain a clean research laboratory feel.
* **Real-Time Streaming:** The UI handles multiple simultaneous Vercel AI SDK streams. Users can watch the text generate in real time across all active phases.
* **Visibility:** The final judge output takes center stage. Intermediate phases render inside collapsible accordions below the main output.
* **History:** A sidebar or dedicated view allows the user to browse past generations.

## Admin Dashboard
* **Prompt Management:** Text areas to edit the system templates for intermediate and judge phases.
* **Demo Configuration:** A dedicated section to define which specific models from models.dev are accessible to the demo account.
* **Extensibility:** The routing and layout must anticipate a future User Management tab.
