# Developer Recent Commands

The `/chat` command library includes a **Recently used** panel for authorized developer sessions.

- It stores up to 12 distinct slash commands in the current browser's local storage.
- Submitting a slash command saves it before the chat page redirects. Repeating a command moves it to the top.
- Clicking a saved command loads it into the message/command composer for review; it does not execute immediately.
- The panel displays a relative last-used time and provides a **Clear history** action.
- `/tda` commands are never saved because the command may include the developer authentication key.
- Storage is local to the browser and site origin. It does not sync between devices. If local storage is disabled, the chat continues to work without history.
- The panel is only rendered when the server identifies the current session as a developer.
