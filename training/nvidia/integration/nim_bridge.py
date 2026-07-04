"""NVIDIA NIM Bridge — Inference Microservices integration."""
import requests
import json


class NIMBridge:
    def __init__(self, endpoint="http://localhost:8000/nim"):
        self.endpoint = endpoint

    def infer(self, model: str, prompt: str, max_tokens=512):
        payload = {"model": model, "prompt": prompt, "max_tokens": max_tokens}
        resp = requests.post(f"{self.endpoint}/v1/completions", json=payload)
        return resp.json()

    def embed(self, model: str, texts: list):
        payload = {"model": model, "input": texts}
        resp = requests.post(f"{self.endpoint}/v1/embeddings", json=payload)
        return resp.json()

    def health(self):
        resp = requests.get(f"{self.endpoint}/health")
        return resp.status_code == 200