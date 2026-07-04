"""Agent Plan Bridge — Nemotron Ultra plan generation."""
import json


class AgentPlanBridge:
    def __init__(self, nim_client=None):
        self.nim = nim_client

    def generate_plan(self, task: str, context: dict) -> dict:
        prompt = f"""Generate a multi-step agent plan for: {task}
Context: {json.dumps(context, indent=2)}
Plan structure: [step_id, action, parameters, expected_outcome]"""
        if self.nim:
            response = self.nim.infer("nemotron-ultra", prompt, max_tokens=2048)
            return json.loads(
                response.get("choices", [{}])[0].get("text", "{}")
            )
        return {"plan": [], "status": "nim_unavailable"}

    def validate_plan(self, plan: dict) -> bool:
        required = all(
            "step_id" in s and "action" in s for s in plan.get("plan", [])
        )
        return required and len(plan.get("plan", [])) > 0