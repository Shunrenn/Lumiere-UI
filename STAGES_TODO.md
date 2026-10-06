# Ground Crew stage TODOs

- Warehouse Return has no dedicated backend confirmation endpoint in the frontend API surface.
- Dispatch Release and Venue Arrival reads currently come from the existing dispatch batch store; checkpoint-phase confirmation is not wired here because the phase endpoint is not exposed by a feature client.
- Egress Release can use the existing `initiateEventEgress` action, but the Field-only adapter currently keeps confirmation disabled until a single stage contract is available.
- The client exposes assignment-level `isLead`, not a stage-specific lead assignment, so it cannot prove that a lead exists for every stage.
- Pre-Event Setup remains a backend checkpoint phase and is not represented as a fourth Ground Crew stage.
