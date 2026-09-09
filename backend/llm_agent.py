import os
import sys
import json
import asyncio
from prompts import AGENT_SYSTEM_PROMPT
from llm_client import LLMPipeline

# Import our custom physics engine tool
from spec_generator import generate_building_spec

async def start_chat():
    print("\n" + "="*60)
    print(" ThermoShelter AI Architect is online.")
    print(" Type 'exit' to quit.")
    print("="*60 + "\n")
    
    pipeline = LLMPipeline()
    history = []
    
    while True:
        try:
            user_input = input("\nYou: ")
            if user_input.lower() in ['quit', 'exit']:
                break
                
            if not user_input.strip():
                continue
                
            print("\nArchitect is thinking (and running physics simulations)...")
            
            history.append({"role": "user", "content": user_input})
            
            response = await pipeline.chat(AGENT_SYSTEM_PROMPT, history)
            
            history.append({"role": "assistant", "content": response})
            
            print("\nArchitect:\n")
            print(response)
            
        except Exception as e:
            print(f"\nAn error occurred: {e}")

if __name__ == "__main__":
    asyncio.run(start_chat())

