"""MiniMax voice configuration for CaseRouter agents."""

# Voice IDs are set after running voice_design via MiniMax MCP tools.
# Until then, use built-in MiniMax voices.
INTAKE_VOICE_ID = "Serene_Woman"  # Warm, empathetic — closest fit for legal intake from the built-in MiniMax voice set
PLACEMENT_VOICE_ID = "male-qn-qingse"  # Professional, direct (placeholder)

# Emotion mappings per agent.
INTAKE_DEFAULT_EMOTION = "neutral"
PLACEMENT_DEFAULT_EMOTION = "neutral"
FOLLOWUP_DEFAULT_EMOTION = "happy"
