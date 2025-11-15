import os
from dotenv import load_dotenv
import openai
load_dotenv(override=True)

import litellm
from utils.log import logger

class LiteLLM():
    def __init__(self, model_name, base_url, api_key):
        self.model_name = model_name
        self.client = openai.OpenAI(
            api_key=api_key,
            base_url=base_url
        )

        if not self.send_message("", "Hello!"):
            raise ValueError(
                f"Failed to connect to {self.model_name} - check your input parameters"
            )

    def send_message(self, system_prompt: str, message: str) -> str | None:
        m = [{"role": "user", "content": message}]
        if system_prompt:
            m.insert(0, {"role": "system", "content": system_prompt})

        try:
            response = self.client.chat.completions.create(
                messages=m,
                model=self.model_name,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            return None

LITELLM_MODEL_NAME = os.getenv("LITELLM_MODEL_NAME")
LITELLM_API_BASE = os.getenv("LITELLM_API_BASE")
LITELLM_API_KEY = os.getenv("LITELLM_API_KEY")

if all([LITELLM_MODEL_NAME, LITELLM_API_BASE, LITELLM_API_KEY]):
    lite_llm = LiteLLM(
        model_name=LITELLM_MODEL_NAME,
        base_url=LITELLM_API_BASE,
        api_key=LITELLM_API_KEY,
    )