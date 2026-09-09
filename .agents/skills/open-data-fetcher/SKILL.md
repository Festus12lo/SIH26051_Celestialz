---
name: open-data-fetcher
description: >-
  Use this skill when the user asks to fetch data from open APIs like Open-Meteo, World Bank, or IMF for the hackathon project.
---

# Open Data Fetcher Helper

This skill guides the agent in integrating external open data APIs into the ThermoShelter backend.

## Instructions

1. Use the `httpx` or `requests` library in Python to perform API calls.
2. For Weather (Open-Meteo):
   - Example endpoint: `https://api.open-meteo.com/v1/forecast?latitude=34.15&longitude=77.58&current_weather=true`
   - Cache results where possible to avoid rate limiting during the demo.
3. For Institutional Data (World Bank / IMF):
   - Query the relevant public REST APIs.
   - Parse the JSON responses into native Python dataclasses or Pydantic models for type safety before using them in the application logic.
