# Flow Space — Milestone 4

## AI Team as a working layer

- AI specialists can be linked to a concrete task.
- AI Team can receive company context, task context and one selected SOP.
- AI output can be attached to the selected task as an execution record.
- Tasks now store `aiAgentId` and `aiExecutionHistory`.
- Task creation/editing allows selecting an AI teammate.
- Task cards show the assigned AI teammate.
- AI output does not auto-complete a task: a human still reviews/accepts the result.
- Context is deliberately scoped; the AI receives only the selected company/task/SOP information.

This keeps Flow Space result-first and prevents AI from silently acting outside the task context.
