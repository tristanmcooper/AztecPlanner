from utils.llm import lite_llm


test = lite_llm.send_message(
    system_prompt="You are a helpful assistant.",
    message="What is the capital of France?"
)

print(test)