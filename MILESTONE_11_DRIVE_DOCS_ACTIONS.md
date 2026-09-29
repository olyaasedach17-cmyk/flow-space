# Milestone 11 — Drive, Docs & Actionable AI

## Added
- Google Docs can be used as a controlled AI Workflow source.
- Generated DOCX/PPTX/TXT artifacts can be saved back to Google Drive after an explicit user action.
- Google Drive upload uses server-side OAuth tokens; tokens never enter the browser.
- AI recommendations can be turned into up to 8 Flow Space tasks after one explicit confirmation.
- Tasks preserve workflow provenance and a concise source summary.
- Google Drive listing/read foundations are available server-side for the next picker UX.

## Safety
- Drive upload is capped at 3 MB for direct serverless multipart upload.
- Docs content is truncated before AI use.
- Every Google action requires Firebase auth and company membership.
- No autonomous task creation: user confirmation is required.

## Next
- Drive file picker UX and Google Calendar planning.
- Activity log for AI/integration actions.
- Notifications and scheduled Executive Briefs.
